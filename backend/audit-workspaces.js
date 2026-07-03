const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function run() {
  const users = await prisma.user.findMany({
    include: {
      ownedWorkspaces: {
        include: {
          _count: { select: { documents: true } }
        }
      },
      workspaceMemberships: {
        include: {
          workspace: {
            include: {
              _count: { select: { documents: true } }
            }
          }
        }
      }
    }
  });

  console.log('--- Workspace & User Audit ---');
  users.forEach(user => {
    console.log(`User: ${user.email} (ID: ${user.id})`);
    
    console.log('  Owned Workspaces:');
    user.ownedWorkspaces.forEach(ws => {
      console.log(`    -> "${ws.name}" (ID: ${ws.id}) - Docs: ${ws._count.documents}`);
    });
    
    console.log('  Member Workspaces:');
    user.workspaceMemberships.forEach(membership => {
      const ws = membership.workspace;
      if (ws) {
        console.log(`    -> "${ws.name}" (ID: ${ws.id}) - Docs: ${ws._count.documents}`);
      }
    });
  });

  await prisma.$disconnect();
}

run().catch(console.error);
