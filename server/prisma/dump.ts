const sourceDbUrl = 'postgresql://postgres:1234@localhost:5432/helpdesk?schema=public';
process.env.DATABASE_URL = sourceDbUrl;

import { prisma } from '../src/db';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Dumping data from host database...');
  const users = await prisma.user.findMany();
  const sessions = await prisma.session.findMany();
  const kbArticles = await prisma.kBArticle.findMany();
  const tickets = await prisma.ticket.findMany();
  const messages = await prisma.message.findMany();

  const dump = { users, sessions, kbArticles, tickets, messages };
  fs.writeFileSync(
    path.join(__dirname, 'dump.json'),
    JSON.stringify(dump, null, 2)
  );
  console.log('Dump completed successfully!');
  console.log(`Users: ${users.length}`);
  console.log(`Sessions: ${sessions.length}`);
  console.log(`KB Articles: ${kbArticles.length}`);
  console.log(`Tickets: ${tickets.length}`);
  console.log(`Messages: ${messages.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
