import { Role, TicketStatus, TicketCategory, MessageSender } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { prisma } from '../src/db';

dotenv.config();


async function main() {
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
