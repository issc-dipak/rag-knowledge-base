/**
 * Direct test: manually process one document and capture the exact error
 */
const { QdrantClient } = require('@qdrant/js-client-rest');
require('dotenv').config();

const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY || undefined,
});

const collectionName = process.env.QDRANT_COLLECTION_NAME || 'rag_documents_v2';

async function testUpsert() {
  console.log('Testing Qdrant upsert with a dummy 384-dimension vector...');
  console.log('Collection:', collectionName);
  console.log('Qdrant URL:', process.env.QDRANT_URL);

  // Check collection config
  const info = await qdrant.getCollection(collectionName);
  const configuredSize = info.config.params.vectors.size;
  console.log('\nCollection vector size:', configuredSize);

  // Test upsert with UUID-style id
  const { v4: uuidv4 } = require('uuid');
  const testId = uuidv4();
  const testVector = Array(configuredSize).fill(0).map(() => Math.random());

  try {
    await qdrant.upsert(collectionName, {
      wait: true,
      points: [{
        id: testId,
        vector: testVector,
        payload: {
          documentId: 'test-doc-id',
          content: 'test content',
          chunkIndex: 0,
          metadata: {
            workspaceId: 'test-workspace-id',
            documentName: 'Test Document',
            fileType: 'pdf',
          },
        },
      }],
    });
    console.log('\n✅ Upsert SUCCESS! Qdrant is working correctly.');
    console.log('The issue must be elsewhere (PDF parsing or file path).');

    // Clean up test point
    await qdrant.delete(collectionName, {
      wait: true,
      filter: { must: [{ key: 'documentId', match: { value: 'test-doc-id' } }] },
    });
    console.log('Test point deleted.');
  } catch (err) {
    console.log('\n❌ Upsert FAILED:', err.message);
    console.log('Full error:', JSON.stringify(err, null, 2));
  }
}

// Also check if the upload file path is accessible
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function checkFilePaths() {
  const docs = await prisma.document.findMany({
    select: { id: true, name: true, path: true, status: true },
    take: 3,
  });

  console.log('\n--- File Path Check ---');
  for (const doc of docs) {
    const exists = fs.existsSync(doc.path);
    console.log(`"${doc.name}": path="${doc.path}" exists=${exists}`);
  }
  await prisma.$disconnect();
}

testUpsert()
  .then(() => checkFilePaths())
  .catch(console.error);
