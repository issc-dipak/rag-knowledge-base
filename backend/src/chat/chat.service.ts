import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingsService, SearchResult } from '../embeddings/embeddings.service';
import OpenAI from 'openai';
import { Response } from 'express';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService,
    private readonly config: ConfigService,
  ) {
    const groqApiKey = config.get('GROQ_API_KEY');
    if (groqApiKey && groqApiKey !== 'your-groq-api-key') {
      this.openai = new OpenAI({
        apiKey: groqApiKey,
        baseURL: 'https://api.groq.com/openai/v1',
      });
    } else {
      this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
    }
  }

  async createChat(userId: string, workspaceId: string, title?: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, members: { some: { userId } } },
    });
    if (!workspace) throw new ForbiddenException('Workspace not found or access denied');

    return this.prisma.chat.create({
      data: {
        title: title || 'New Chat',
        userId,
        workspaceId,
        model: this.config.get('OPENAI_MODEL', 'gpt-4o'),
        temperature: parseFloat(this.config.get('OPENAI_TEMPERATURE', '0.1')),
        maxTokens: parseInt(this.config.get('OPENAI_MAX_TOKENS', '4096')),
      },
    });
  }

  async findAllChats(userId: string, workspaceId: string, page = 1, limit = 20) {
    const pageNum = isNaN(Number(page)) || Number(page) < 1 ? 1 : Number(page);
    const limitNum = isNaN(Number(limit)) || Number(limit) < 1 ? 20 : Number(limit);
    const skip = (pageNum - 1) * limitNum;
    const [chats, total] = await Promise.all([
      this.prisma.chat.findMany({
        where: { userId, workspaceId, isArchived: false },
        skip,
        take: limitNum,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { messages: true } },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { content: true, createdAt: true },
          },
        },
      }),
      this.prisma.chat.count({ where: { userId, workspaceId, isArchived: false } }),
    ]);

    return {
      data: chats,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findChatById(id: string, userId: string) {
    const chat = await this.prisma.chat.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true, role: true, content: true, sources: true,
            tokensUsed: true, cost: true, createdAt: true,
          },
        },
      },
    });
    if (!chat) throw new NotFoundException('Chat not found');
    return chat;
  }

  async sendMessage(
    chatId: string,
    userId: string,
    content: string,
    res: Response,
    documentIds?: string[],
  ) {
    const chat = await this.prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) throw new NotFoundException('Chat not found');

    // Save user message
    await this.prisma.message.create({
      data: {
        chatId,
        role: 'USER',
        content,
        documents: {
          connect: (documentIds || []).map((id) => ({ id })),
        },
      },
    });

    // Retrieve relevant context from RAG
    const searchResults = await this.embeddings.searchSimilar(content, chat.workspaceId, {
      limit: 8,
      scoreThreshold: 0.25,
      documentIds: documentIds?.length ? documentIds : undefined,
    });

    const systemPrompt = this.buildSystemPrompt(searchResults);
    const messages = await this.buildMessageHistory(chatId, content);

    // Start SSE streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    let fullResponse = '';
    let totalTokens = 0;

    try {
      const stream = await this.openai.chat.completions.create({
        model: chat.model || this.config.get('OPENAI_MODEL', 'gpt-4o'),
        temperature: chat.temperature || 0.1,
        max_tokens: chat.maxTokens || 4096,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`);
        }
        if (chunk.usage) {
          totalTokens = chunk.usage.total_tokens;
        }
      }

      // Format sources for response
      const sources = searchResults.map((r) => ({
        documentId: r.documentId,
        documentName: r.documentName,
        pageNumber: r.pageNumber,
        score: r.score,
        excerpt: r.content.substring(0, 200),
      }));

      // Estimate cost (gpt-4o pricing)
      const cost = (totalTokens / 1000) * 0.005;

      // Save assistant message
      const assistantMessage = await this.prisma.message.create({
        data: {
          chatId,
          role: 'ASSISTANT',
          content: fullResponse,
          sources: sources as any,
          tokensUsed: totalTokens,
          cost,
          model: chat.model,
        },
      });

      // Update chat stats
      await this.prisma.chat.update({
        where: { id: chatId },
        data: {
          totalTokens: { increment: totalTokens },
          totalCost: { increment: cost },
          updatedAt: new Date(),
          title: chat.title === 'New Chat'
            ? content.substring(0, 60) + (content.length > 60 ? '...' : '')
            : undefined,
        },
      });

      // Log usage
      await this.prisma.usageLog.create({
        data: {
          userId,
          action: 'chat_completion',
          model: chat.model,
          tokensUsed: totalTokens,
          cost,
        },
      });

      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          messageId: assistantMessage.id,
          sources,
          tokensUsed: totalTokens,
          cost,
        })}\n\n`,
      );
      res.end();
    } catch (error) {
      this.logger.error(`Streaming error: ${error.message}`);
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
      res.end();
    }
  }

  private buildSystemPrompt(context: SearchResult[]): string {
    if (context.length === 0) {
      return `You are a helpful AI assistant for a knowledge base application.
You help users find information from their uploaded documents.
If the user asks about something not in the documents, clearly state:
"I couldn't find this information in your uploaded documents."
Never make up information. Always be accurate and cite your sources.`;
    }

    const contextText = context
      .map(
        (r, i) =>
          `[Source ${i + 1}] Document: "${r.documentName}"${r.pageNumber ? `, Page ${r.pageNumber}` : ''}
Content: ${r.content}`,
      )
      .join('\n\n---\n\n');

    return `You are a helpful AI assistant for a knowledge base application.
Answer questions based ONLY on the following context from the user's documents.
If the answer is not found in the context, clearly say:
"I couldn't find this information in your uploaded documents."

IMPORTANT RULES:
1. Never hallucinate or make up information
2. Always cite which document and page number your answer comes from
3. Be precise and accurate
4. If asked for something not in context, be honest about it
5. Format your response clearly with markdown when helpful

CONTEXT FROM DOCUMENTS:
${contextText}

When citing, use format: [Document Name, Page X] or [Document Name] if no page available.`;
  }

  private async buildMessageHistory(chatId: string, newContent: string) {
    const history = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      take: 20, // Keep last 20 messages for context
      select: { role: true, content: true },
    });

    const messages = history.map((m) => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content,
    }));

    messages.push({ role: 'user', content: newContent });
    return messages;
  }

  async renameChat(id: string, userId: string, title: string) {
    const chat = await this.prisma.chat.findFirst({ where: { id, userId } });
    if (!chat) throw new NotFoundException('Chat not found');
    return this.prisma.chat.update({ where: { id }, data: { title } });
  }

  async deleteChat(id: string, userId: string) {
    const chat = await this.prisma.chat.findFirst({ where: { id, userId } });
    if (!chat) throw new NotFoundException('Chat not found');
    await this.prisma.message.deleteMany({ where: { chatId: id } });
    await this.prisma.chat.delete({ where: { id } });
    return { message: 'Chat deleted successfully' };
  }

  async regenerateLastResponse(chatId: string, userId: string, res: Response) {
    const chat = await this.prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) throw new NotFoundException('Chat not found');

    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });

    if (messages.length < 2) throw new NotFoundException('Not enough messages to regenerate');

    const lastAssistant = messages[0];
    const lastUser = messages[1];

    // Delete last assistant message
    await this.prisma.message.delete({ where: { id: lastAssistant.id } });

    // Re-send
    await this.sendMessage(chatId, userId, lastUser.content, res);
  }

  async exportChatToPdf(chatId: string, userId: string): Promise<Buffer> {
    const chat = await this.findChatById(chatId, userId);
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text(chat.title, { align: 'center' });
      doc.moveDown();

      for (const message of (chat as any).messages) {
        doc.fontSize(12).fillColor(message.role === 'USER' ? '#1a73e8' : '#333');
        doc.text(`${message.role === 'USER' ? 'You' : 'Assistant'}:`, { continued: false });
        doc.fontSize(11).fillColor('#555').text(message.content);
        doc.moveDown();
      }

      doc.end();
    });
  }

  async exportChatToMarkdown(chatId: string, userId: string): Promise<string> {
    const chat = await this.findChatById(chatId, userId);
    let md = `# ${chat.title}\n\n`;
    md += `*Exported on ${new Date().toLocaleDateString()}*\n\n---\n\n`;

    for (const message of (chat as any).messages) {
      const role = message.role === 'USER' ? '**You**' : '**Assistant**';
      md += `${role}:\n\n${message.content}\n\n---\n\n`;
    }

    return md;
  }
}
