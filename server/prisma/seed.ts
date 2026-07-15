import { Role, TicketStatus, TicketCategory, MessageSender } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { prisma } from '../src/db';

dotenv.config();

async function main() {
  const dumpPath = path.join(__dirname, 'dump.json');
  if (fs.existsSync(dumpPath)) {
    console.log('Restoring database from dump.json...');
    const data = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));

    // Clear existing data in correct dependency order
    console.log('Clearing existing database tables...');
    await prisma.message.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.kBArticle.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();

    // 1. Restore Users
    console.log(`Restoring ${data.users.length} users...`);
    for (const user of data.users) {
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role,
          deletedAt: user.deletedAt ? new Date(user.deletedAt) : null,
          createdAt: new Date(user.createdAt),
          updatedAt: new Date(user.updatedAt),
        },
      });
    }

    // 2. Restore Sessions
    console.log(`Restoring ${data.sessions.length} sessions...`);
    for (const session of data.sessions) {
      await prisma.session.create({
        data: {
          id: session.id,
          sid: session.sid,
          userId: session.userId,
          expiresAt: new Date(session.expiresAt),
          createdAt: new Date(session.createdAt),
        },
      });
    }

    // 3. Restore KB Articles
    console.log(`Restoring ${data.kbArticles.length} KB articles...`);
    for (const article of data.kbArticles) {
      await prisma.kBArticle.create({
        data: {
          id: article.id,
          title: article.title,
          content: article.content,
          authorId: article.authorId,
          createdAt: new Date(article.createdAt),
          updatedAt: new Date(article.updatedAt),
        },
      });
    }

    // 4. Restore Tickets
    console.log(`Restoring ${data.tickets.length} tickets...`);
    for (const ticket of data.tickets) {
      await prisma.ticket.create({
        data: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          studentEmail: ticket.studentEmail,
          subject: ticket.subject,
          status: ticket.status,
          category: ticket.category,
          aiSummary: ticket.aiSummary,
          aiSuggestedReply: ticket.aiSuggestedReply,
          aiConfidence: ticket.aiConfidence,
          assignedToId: ticket.assignedToId,
          createdAt: new Date(ticket.createdAt),
          updatedAt: new Date(ticket.updatedAt),
        },
      });
    }

    // Reset ticketNumber sequence to prevent key collisions
    if (data.tickets.length > 0) {
      await prisma.$executeRawUnsafe(`
        SELECT setval(pg_get_serial_sequence('"Ticket"', 'ticketNumber'), COALESCE(MAX("ticketNumber"), 1)) FROM "Ticket"
      `);
    }

    // 5. Restore Messages
    console.log(`Restoring ${data.messages.length} messages...`);
    for (const msg of data.messages) {
      await prisma.message.create({
        data: {
          id: msg.id,
          ticketId: msg.ticketId,
          sender: msg.sender,
          senderEmail: msg.senderEmail,
          body: msg.body,
          messageId: msg.messageId,
          createdAt: new Date(msg.createdAt),
        },
      });
    }

    console.log('Database restore completed successfully!');
    return;
  }

  console.log('Seeding database...');

  // 1. Create default admin account if it does not exist
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'password123';
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  
  if (!admin) {
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: Role.ADMIN,
      },
    });
    console.log(`Created admin account: ${admin.email}`);
  } else {
    console.log(`Admin account already exists: ${admin.email}`);
  }

  // 2. Create default agent account if it does not exist
  const agentEmail = 'agent@helpdesk.edu';
  let agent = await prisma.user.findUnique({ where: { email: agentEmail } });
  
  if (!agent) {
    const agentPasswordHash = await bcrypt.hash('agent123', 10);
    agent = await prisma.user.create({
      data: {
        email: agentEmail,
        passwordHash: agentPasswordHash,
        role: Role.AGENT,
      },
    });
    console.log(`Created agent account: ${agent.email}`);
  } else {
    console.log(`Agent account already exists: ${agent.email}`);
  }

  // 2.5 Create AI agent account if it does not exist
  const aiEmail = 'ai@helpdesk.edu';
  let aiUser = await prisma.user.findUnique({ where: { email: aiEmail } });
  
  if (!aiUser) {
    const aiPasswordHash = await bcrypt.hash('ai123', 10);
    aiUser = await prisma.user.create({
      data: {
        email: aiEmail,
        passwordHash: aiPasswordHash,
        role: Role.AGENT,
      },
    });
    console.log(`Created AI agent account: ${aiUser.email}`);
  } else {
    console.log(`AI agent account already exists: ${aiUser.email}`);
  }

  // 3. Create initial KB articles if none exist
  const articleCount = await prisma.kBArticle.count();
  if (articleCount === 0) {
    const articles = [
      {
        title: 'Refund Policy & Timeline',
        content: `### Refund Policy & Timeline

We offer refunds for tuition and course materials under the following conditions:
- **Full Refund**: Requests submitted within the first 14 calendar days of the semester start date.
- **Partial Refund (50%)**: Requests submitted between day 15 and day 30 of the semester.
- **No Refund**: Requests submitted after the 30th calendar day of the semester.

To request a refund, students must submit a formal Refund Request ticket. All refunds are processed back to the original payment method within 5-7 business days once approved by an administrator.`,
        authorId: admin.id,
      },
      {
        title: 'Connecting to Campus Wi-Fi',
        content: `### Connecting to Campus Wi-Fi

To connect to the campus secure wireless network (**EduWifi**):
1. Select **EduWifi** from your device's Wi-Fi network settings.
2. Enter your student portal email address as the username (e.g., username@student.edu).
3. Enter your student portal password.
4. If prompted to trust a certificate, select **Trust** or **Accept**.

For guest access, use the network **Campus-Guest**, which does not require authentication but has restricted speeds and blocks secure academic resources.`,
        authorId: agent.id,
      },
      {
        title: 'Resetting Student Portal Password',
        content: `### Resetting Student Portal Password

If you are locked out of your student portal or forgot your password, please follow these steps:
1. Navigate to the student portal login page at [portal.university.edu](https://portal.university.edu).
2. Click on the **Forgot Password?** link below the login form.
3. Enter your registered student email address.
4. Check your email for a password reset link (valid for 2 hours).
5. Click the link and set a new password containing at least 8 characters, 1 number, and 1 uppercase letter.

If you do not receive the email or are still unable to log in, please submit a **Technical Question** ticket.`,
        authorId: agent.id,
      },
    ];

    for (const article of articles) {
      const created = await prisma.kBArticle.create({
        data: article,
      });
      console.log(`Created KB Article: "${created.title}"`);
    }
  } else {
    console.log('KB Articles already exist, skipping article creation.');
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
