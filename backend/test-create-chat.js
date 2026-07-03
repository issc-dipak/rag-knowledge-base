const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = '05db2f7d-d883-461c-980b-bff2676742b5';
  const workspaceId = '24e9d54a-3e68-48bb-b116-79743b3f0675';

  console.log('Checking workspace membership...');
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, members: { some: { userId } } },
  });
  console.log('Workspace found:', workspace);

  if (!workspace) {
    console.log('Workspace member entry check:');
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId }
    });
    console.log('Member entry:', member);
  }

  console.log('Trying to insert chat...');
  try {
    const chat = await prisma.chat.create({
      data: {
        title: 'New Chat',
        userId,
        workspaceId,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.1,
        maxTokens: 4096,
      },
    });
    console.log('✅ Chat created successfully:', chat);
  } catch (error) {
    console.error('❌ Failed to create chat:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
