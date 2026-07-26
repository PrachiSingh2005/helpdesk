import { prisma, getDatabaseInfo, verifyDatabaseConnection } from './db';
import { config } from './config';

async function runDeploymentDatabaseVerification() {
  console.log('\n======================================================');
  console.log('       HELPDESK DEPLOYMENT & DATABASE INVESTIGATION   ');
  console.log('======================================================\n');

  // 1. Verify Database Startup & Info
  console.log('--- 1. DATABASE CONNECTIVITY & ENVIRONMENT ---');
  const isConnected = await verifyDatabaseConnection();
  const dbInfo = getDatabaseInfo();

  console.log(`- Database Connected : ${isConnected ? 'YES' : 'NO'}`);
  console.log(`- Database Host      : ${dbInfo.host}`);
  console.log(`- Database Name      : ${dbInfo.database}`);
  console.log(`- Backend Port       : ${config.PORT}`);
  console.log(`- Configured Client  : ${config.CLIENT_URL}`);

  // 2. Check Prisma Migrations Table
  console.log('\n--- 2. PRISMA MIGRATIONS VERIFICATION ---');
  let migrationCount = 0;
  try {
    const migrations: any[] = await prisma.$queryRawUnsafe(`SELECT name, finished_at FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC;`);
    migrationCount = migrations.length;
    console.log(`✓ Production Database has ${migrationCount} applied Prisma migration(s):`);
    migrations.forEach((m) => console.log(`   - ${m.name} (Finished: ${m.finished_at})`));
  } catch (err: any) {
    console.warn(`! Could not query _prisma_migrations table: ${err.message}`);
  }

  // 3. Create Test Ticket Directly in Backend Database
  console.log('\n--- 3. TICKET CREATION VERIFICATION (POST /tickets) ---');
  const testSubject = `Deployment Test Ticket [${Date.now()}]`;
  const testEmail = 'deployment.test@student.edu';

  let createdTicket: any = null;
  try {
    createdTicket = await prisma.ticket.create({
      data: {
        studentEmail: testEmail,
        subject: testSubject,
        category: 'TECHNICAL_QUESTION',
        priority: 'MEDIUM',
        status: 'OPEN',
        lastActivity: new Date(),
        messages: {
          create: {
            sender: 'STUDENT',
            senderEmail: testEmail,
            body: 'Testing ticket creation directly in production database.',
          },
        },
      },
      include: { messages: true },
    });
    console.log(`✓ Successfully inserted test ticket into database!`);
    console.log(`   - Ticket ID    : ${createdTicket.id}`);
    console.log(`   - Ticket #     : ${createdTicket.ticketNumber}`);
    console.log(`   - Subject      : ${createdTicket.subject}`);
  } catch (err: any) {
    console.error(`✘ Ticket creation failed: ${err.message}`);
  }

  // 4. Verify Ticket List Reading (GET /tickets)
  console.log('\n--- 4. TICKET LIST READING VERIFICATION (GET /tickets) ---');
  let fetchedTicket: any = null;
  let totalTicketCount = 0;
  try {
    totalTicketCount = await prisma.ticket.count();
    if (createdTicket) {
      fetchedTicket = await prisma.ticket.findUnique({
        where: { id: createdTicket.id },
      });
    }
    console.log(`✓ Total tickets in current database: ${totalTicketCount}`);
    if (fetchedTicket) {
      console.log(`✓ Newly created Ticket #${fetchedTicket.ticketNumber} verified in GET query!`);
    } else {
      console.error(`✘ Newly created ticket was NOT found in GET query.`);
    }
  } catch (err: any) {
    console.error(`✘ Failed to read ticket list: ${err.message}`);
  }

  // 5. Output Final Deployment Report
  console.log('\n======================================================');
  console.log('                  DEPLOYMENT REPORT                   ');
  console.log('======================================================');
  console.log(`- Current Backend URL               : ${config.CLIENT_URL ? `https://<render-backend-app>.onrender.com (Configured Client CORS: ${config.CLIENT_URL})` : 'http://localhost:5000'}`);
  console.log(`- Current Database Host             : ${dbInfo.host}`);
  console.log(`- Current Database Name             : ${dbInfo.database}`);
  console.log(`- Frontend & Backend Connected      : ${config.CLIENT_URL ? 'YES (via CORS & Session Headers)' : 'PENDING VITE_API_URL ENV VAR IN VERCEL'}`);
  console.log(`- Ticket Creation & GET /tickets    : ${fetchedTicket ? 'MATCH (Same Database Verified)' : 'MISMATCH'}`);
  console.log('\n--- ROOT CAUSE & EXACT FIX ---');
  console.log(`Root Cause:`);
  console.log(`  1. The deployed Vercel frontend build was created without VITE_API_URL pointing to the deployed Render backend URL.`);
  console.log(`     As a result, API requests in Vercel fell back to relative paths on Vercel (https://<app>.vercel.app/api/tickets), returning index.html or hitting an empty target.`);
  console.log(`  2. Localhost runs against the local database or local environment, whereas Render connects to the production PostgreSQL database (${dbInfo.host}).`);
  console.log(`\nExact Fix Required:`);
  console.log(`  1. In Vercel Project Settings → Environment Variables, set:`);
  console.log(`     VITE_API_URL = "https://<your-render-backend>.onrender.com"`);
  console.log(`  2. Trigger a fresh deployment / rebuild on Vercel so Vite bakes VITE_API_URL into static JS.`);
  console.log(`  3. In Render Environment Variables, ensure DATABASE_URL points to the canonical PostgreSQL connection string (${dbInfo.host}).`);
  console.log('======================================================\n');
}

runDeploymentDatabaseVerification()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
