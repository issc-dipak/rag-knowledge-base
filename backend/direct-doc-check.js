const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function run() {
  const userId = '863d2cf3-3c5a-40d8-a3f0-5a61978b1d22'; // dipakpatil181023@gmail.com
  const workspaceId = 'ecef23d1-eb57-4aa3-a203-4cdba67dcba8'; // My Workspace

  const where = { workspaceId, userId };
  
  const documents = await prisma.document.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Prisma query returned ${documents.length} docs`);
  documents.forEach(d => {
    console.log(`- Doc: ${d.name} (Status: ${d.status})`);
  });

  await prisma.$disconnect();
}

run().catch(console.error);
