/**
 * Test PDF parsing directly to find the exact "Bad Request" error
 */
require('dotenv').config();
const fs = require('fs');

async function testPdfParse(filePath) {
  console.log('\nTesting PDF parse for:', filePath);
  try {
    const pdfParse = require('pdf-parse');
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    console.log('✅ PDF parsed OK! Pages:', data.numpages, 'Text length:', data.text.length);
    console.log('First 200 chars:', data.text.substring(0, 200));
    return data.text;
  } catch (error) {
    console.log('❌ PDF parse failed:', error.message);
    return null;
  }
}

// Test Xenova embedding generation
async function testEmbedding(text) {
  console.log('\nTesting Xenova embedding...');
  try {
    const { pipeline } = await eval('import("@xenova/transformers")');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const output = await extractor(text.substring(0, 500), { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data);
    console.log('✅ Embedding generated! Size:', embedding.length);
    return embedding;
  } catch (error) {
    console.log('❌ Embedding failed:', error.message);
    return null;
  }
}

// Test Qdrant upsert with UUID (not string) id
async function testQdrantUpsert(documentId, embedding) {
  const { QdrantClient } = require('@qdrant/js-client-rest');
  const { v4: uuidv4 } = require('uuid');
  const qdrant = new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY || undefined,
  });

  console.log('\nTesting Qdrant upsert with real embedding...');
  
  // THIS IS THE KEY TEST - the actual code uses: id: `${documentId}_${chunkIndex}` (STRING)
  // Qdrant may reject non-UUID strings!
  const stringId = `${documentId}_0`;
  const uuidId = uuidv4();
  
  console.log('Testing with string ID:', stringId);
  try {
    await qdrant.upsert(process.env.QDRANT_COLLECTION_NAME || 'rag_documents_v2', {
      wait: true,
      points: [{
        id: stringId,
        vector: embedding,
        payload: { documentId, content: 'test', chunkIndex: 0, metadata: { workspaceId: 'test', documentName: 'test', fileType: 'pdf' } },
      }],
    });
    console.log('✅ String ID upsert SUCCESS!');
  } catch (err) {
    console.log('❌ String ID upsert FAILED:', err.message);
    console.log('   -> This is the bug! Qdrant rejects non-UUID string IDs.');
    
    console.log('\nTesting with UUID ID:', uuidId);
    try {
      await qdrant.upsert(process.env.QDRANT_COLLECTION_NAME || 'rag_documents_v2', {
        wait: true,
        points: [{
          id: uuidId,
          vector: embedding,
          payload: { documentId, content: 'test', chunkIndex: 0, metadata: { workspaceId: 'test', documentName: 'test', fileType: 'pdf' } },
        }],
      });
      console.log('✅ UUID ID upsert SUCCESS! Confirmed: string IDs are the problem.');
      // cleanup
      await qdrant.delete(process.env.QDRANT_COLLECTION_NAME || 'rag_documents_v2', {
        wait: true, filter: { must: [{ key: 'documentId', match: { value: documentId } }] },
      });
    } catch (err2) {
      console.log('❌ UUID ID also failed:', err2.message);
    }
  }
}

async function main() {
  // Use first existing PDF
  const testPath = 'uploads\\documents\\bd3e99bd-1992-48a7-ad68-94a56b44a9f9.pdf';
  
  const text = await testPdfParse(testPath);
  if (!text) {
    console.log('\nPDF failed - that is the root cause!');
    return;
  }
  
  const embedding = await testEmbedding(text);
  if (!embedding) {
    console.log('\nEmbedding failed - that is the root cause!');
    return;
  }
  
  await testQdrantUpsert('test-doc-' + Date.now(), embedding);
}

main().catch(console.error);
