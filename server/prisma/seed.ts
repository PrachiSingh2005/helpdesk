import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing data (cascade handles dependencies)
  await prisma.session.deleteMany();
  await prisma.message.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.kBArticle.deleteMany();
  await prisma.user.deleteMany();

  // Create default admin account
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@helpdesk.edu',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });
  console.log(`Created admin account: ${admin.email}`);

  // Create default agent account
  const agentPasswordHash = await bcrypt.hash('agent123', 10);
  const agent = await prisma.user.create({
    data: {
      email: 'agent@helpdesk.edu',
      passwordHash: agentPasswordHash,
      role: 'AGENT',
    },
  });
  console.log(`Created agent account: ${agent.email}`);

  // Create some initial KB articles
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
