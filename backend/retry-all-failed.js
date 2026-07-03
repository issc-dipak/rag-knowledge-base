/**
 * Retry script - resets all FAILED documents to PENDING and queues them for reprocessing
 * Run: node retry-all-failed.js
 */
const { PrismaClient } = require('@prisma/client');
const Bull = require('bull');
require('dotenv').config();

const prisma = new PrismaClient();

// Connect to Redis (Bull queue)
const documentQueue = new Bull('document-processing', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    tls: {},
  },
});

async function run() {
  console.log('Fetching all FAILED documents...');
  const failedDocs = await prisma.document.findMany({
    where: { status: 'FAILED' },
    select: { id: true, name: true },
  });

  if (failedDocs.length === 0) {
    console.log('No failed documents found.');
    await prisma.$disconnect();
    await documentQueue.close();
    return;
  }

  console.log(`Found ${failedDocs.length} failed documents. Resetting and queuing...`);

  for (const doc of failedDocs) {
    // Reset status to PENDING
    await prisma.document.update({
      where: { id: doc.id },
      data: { status: 'PENDING', processingError: null, chunkCount: null },
    });

    // Delete old chunks if any
    await prisma.documentChunk.deleteMany({ where: { documentId: doc.id } });

    // Queue for reprocessing
    await documentQueue.add('process-document', { documentId: doc.id }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });

    console.log(`  Queued: "${doc.name}" (${doc.id})`);
  }

  console.log('\nDone! All failed documents have been queued for reprocessing.');
  console.log('Check the backend logs to see processing progress.');
  
  await prisma.$disconnect();
  await documentQueue.close();
}

run().catch(async (err) => {
  console.error('Error:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
