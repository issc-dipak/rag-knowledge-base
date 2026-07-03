const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function run() {
  const docs = await prisma.document.findMany({
    select: { id: true, name: true, status: true, chunkCount: true, processingError: true, workspaceId: true },
  });
  console.log('Documents in DB:');
  docs.forEach(d => {
    console.log(`  [${d.status}] "${d.name}" — chunks: ${d.chunkCount}, workspaceId: ${d.workspaceId}`);
    if (d.processingError) console.log(`    ERROR: ${d.processingError}`);
  });
  await prisma.$disconnect();
}

run().catch(console.error);
