import { prisma } from './db';
import { TicketStatus, TicketCategory, MessageSender } from '@prisma/client';

const firstNames = ['Emily', 'Michael', 'Sarah', 'David', 'Jessica', 'James', 'Ashley', 'John', 'Amanda', 'Robert', 'Megan', 'William', 'Elizabeth', 'Daniel', 'Rachel', 'Joseph', 'Samantha', 'Richard', 'Lauren', 'Charles'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

const domains = ['student.edu', 'university.edu', 'college.edu', 'mail.edu'];

const technicalTemplates = [
  {
    subject: 'Cannot connect to EduWifi in Science Building',
    body: 'Hi, I have been trying to connect my laptop to EduWifi in the Science Hall but it keeps giving me an authentication error. My student portal login works fine on my phone. Can you help?',
    aiSummary: 'Student reports connection issues with EduWifi in the Science Hall; authentication fails on laptop.',
    aiSuggestedReply: 'Please forget the network "EduWifi" on your laptop, restart, and try reconnecting using your full student email address and portal password.',
    aiConfidence: 0.94,
  },
  {
    subject: 'Requesting password reset for student portal',
    body: 'Hello, I forgot my student portal password and the self-service reset page says my email is not recognized. I need to register for my fall classes today. Please reset it.',
    aiSummary: 'Student is locked out of portal and password reset self-service is failing.',
    aiSuggestedReply: 'We have initiated a manual password reset. A temporary link has been sent to your backup email address.',
    aiConfidence: 0.97,
  },
  {
    subject: 'Matlab installation license key expired',
    body: 'Dear IT Help Desk, my Matlab license just expired today. I need it for my engineering lab assignment due tomorrow morning. Where can I get the new activation key?',
    aiSummary: 'Student requires renewal key for Matlab student license.',
    aiSuggestedReply: 'The current Matlab campus activation key is available in the Software section of the student portal or at kb.university.edu/matlab.',
    aiConfidence: 0.91,
  },
  {
    subject: 'Library printing quota not updating after payment',
    body: 'I added $10 to my PaperCut printing account through the campus portal, but when I try to print at the library it says my balance is still $0.00. I have the receipt.',
    aiSummary: 'Payment made to printing account balance is not reflecting in library PaperCut system.',
    aiSuggestedReply: 'Please forward your payment receipt to print-support@university.edu and they will manually refresh your quota.',
    aiConfidence: 0.88,
  },
  {
    subject: 'VPN disconnected constantly when working from home',
    body: 'I am trying to access the library research databases using the Cisco AnyConnect VPN, but it disconnects every 5 minutes. Is there a server outage or issue on my end?',
    aiSummary: 'Student experiencing frequent disconnections with the campus Cisco AnyConnect VPN.',
    aiSuggestedReply: 'Ensure you are using the vpn.university.edu gateway. Try switching from UDP to TCP protocol in VPN settings.',
    aiConfidence: 0.86,
  },
  {
    subject: 'Canvas course page not showing up for CS 101',
    body: 'I registered for CS 101 yesterday morning, but the course is still not showing up in my Canvas dashboard. The professor said the page is published. What should I do?',
    aiSummary: 'CS 101 course is missing on Canvas dashboard after registration.',
    aiSuggestedReply: 'Course synchronizations from registrar to Canvas take up to 24 hours. If it is still missing tomorrow, contact registrar-systems.',
    aiConfidence: 0.95,
  },
];

const refundTemplates = [
  {
    subject: 'Requesting refund for dropped Chemistry course lab fee',
    body: 'I dropped CHEM 202 on the second day of class, but my student account still shows a charge of $150 for the chemistry lab fee. Can this fee be refunded since I never attended?',
    aiSummary: 'Student requests refund of $150 chemistry lab fee after dropping the class on day 2.',
    aiSuggestedReply: 'Lab fee refunds are automated for classes dropped during the add/drop week. Your refund is pending processing.',
    aiConfidence: 0.96,
  },
  {
    subject: 'Meal plan cancellation and refund request',
    body: 'Hi, I need to cancel my voluntary 14-meal plan because I am moving off-campus next week. I would like a refund for the remaining weeks of the semester.',
    aiSummary: 'Student requests dining meal plan cancellation and partial refund due to moving off-campus.',
    aiSuggestedReply: 'Meal plan refunds are prorated based on the week of cancellation. Please fill out the form at housing.university.edu/cancel.',
    aiConfidence: 0.89,
  },
  {
    subject: 'Double charge on tuition payment card',
    body: 'I paid my tuition balance online yesterday, but my credit card statement shows two identical charges of $1,250. Please refund one of them as soon as possible.',
    aiSummary: 'Double payment charge of $1,250 detected on credit card statement for tuition.',
    aiSuggestedReply: 'We see the double transaction. One charge is an authorization hold and will void automatically in 2-3 business days.',
    aiConfidence: 0.98,
  },
  {
    subject: 'Health insurance waiver refund inquiry',
    body: 'I submitted my private health insurance waiver before the deadline, and it was approved. However, I was still charged for the university health plan. When will I get my refund?',
    aiSummary: 'Student queries refund/credit for health insurance charge after waiver approval.',
    aiSuggestedReply: 'Credits for approved health insurance waivers are applied to student accounts within 10 business days of waiver approval.',
    aiConfidence: 0.93,
  },
  {
    subject: 'Housing deposit refund status',
    body: 'I cancelled my housing application for next semester three weeks ago. I was told my $200 deposit was refundable if cancelled before June 1. Can you check on my refund?',
    aiSummary: 'Inquiry regarding $200 housing deposit refund status after timely cancellation.',
    aiSuggestedReply: 'Your deposit refund has been approved and is being processed by the bursar. Expect a direct deposit within 5 days.',
    aiConfidence: 0.92,
  },
];

const generalTemplates = [
  {
    subject: 'Information on parking permit registration dates',
    body: 'When do parking permit applications open for the fall semester? I will be living in University Commons and need a resident parking sticker.',
    aiSummary: 'Student asks for fall parking permit application start dates for residential students.',
    aiSuggestedReply: 'Fall parking permits go on sale starting August 1st at 9:00 AM online at parking.university.edu.',
    aiConfidence: 0.95,
  },
  {
    subject: 'Library opening hours during final exams week',
    body: 'Is the main library open 24 hours during finals week? If not, what are the late night study hours for the basement level?',
    aiSummary: 'Student inquires about library hours during final exam week.',
    aiSuggestedReply: 'The main library operates 24/7 starting the week before finals through the last day of exams.',
    aiConfidence: 0.97,
  },
  {
    subject: 'Requirements for graduation ceremony check-in',
    body: 'I am graduating this winter. Where and when do I pick up my cap and gown, and what time do graduates need to arrive at the arena?',
    aiSummary: 'Winter graduation details: cap/gown pickup and arrival times.',
    aiSuggestedReply: 'Cap and gown pickup is at the university bookstore Dec 5-10. Graduates must arrive 90 minutes before the ceremony.',
    aiConfidence: 0.91,
  },
  {
    subject: 'Lost wallet in Student Union dining hall',
    body: 'I think I left a black leather wallet at the Student Union food court yesterday around 2 PM. Has anyone turned it in to the lost and found?',
    aiSummary: 'Student reports lost wallet in Student Union food court.',
    aiSuggestedReply: 'Please check with the Student Union information desk, or visit the campus police central lost and found repository.',
    aiConfidence: 0.85,
  },
  {
    subject: 'Immunization record submission deadline',
    body: 'Hi, what is the deadline to submit my mandatory immunization records? I am an incoming freshman starting in the fall.',
    aiSummary: 'Inquiry about mandatory immunization records submission deadline.',
    aiSuggestedReply: 'Immunization records must be uploaded to the student health portal by July 15th to avoid registration holds.',
    aiConfidence: 0.96,
  },
];

const agentReplies = [
  'I have updated your ticket status and notified the coordinator. Let us know if you need anything else.',
  'Thanks for letting us know! The issue should be fully resolved now. Please test it and confirm.',
  'We have processed your request. Please allow a few days for processing and check your student portal account.',
  'The details have been updated in our system. Let me know if you run into any further issues.',
  'We appreciate your patience. This has been forwarded to the appropriate department for immediate review.',
];

async function seedDiverseTickets() {
  console.log('Seeding 100 diverse tickets...');

  // Delete all existing tickets to prevent collision and start fresh
  const deleteCount = await prisma.ticket.deleteMany({});
  console.log(`Deleted ${deleteCount.count} existing tickets to ensure clean state.`);

  const statuses = [TicketStatus.OPEN, TicketStatus.RESOLVED, TicketStatus.CLOSED];
  const categories = [TicketCategory.TECHNICAL_QUESTION, TicketCategory.REFUND_REQUEST, TicketCategory.GENERAL_QUESTION];

  // Helper to generate a random date in the last 30 days
  const randomDate = (startDaysAgo: number, endDaysAgo: number) => {
    const start = new Date();
    start.setDate(start.getDate() - startDaysAgo);
    const end = new Date();
    end.setDate(end.getDate() - endDaysAgo);
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  };

  const ticketsData = [];

  for (let i = 1; i <= 100; i++) {
    // Determine category
    const category = categories[i % categories.length];

    // Determine status (mostly resolved/closed for older, open for newer)
    let status = statuses[i % statuses.length];
    
    // Choose template based on category
    let template;
    if (category === TicketCategory.TECHNICAL_QUESTION) {
      template = technicalTemplates[i % technicalTemplates.length];
    } else if (category === TicketCategory.REFUND_REQUEST) {
      template = refundTemplates[i % refundTemplates.length];
    } else {
      template = generalTemplates[i % generalTemplates.length];
    }

    // Generate random student name and email
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const studentEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;

    // Timestamps
    const createdDate = randomDate(30, 0);
    const updatedDate = new Date(createdDate.getTime() + Math.random() * (new Date().getTime() - createdDate.getTime()));

    // AI confidence variation
    const aiConfidence = Math.max(0.40, Math.min(1.0, template.aiConfidence + (Math.random() * 0.1 - 0.05)));

    ticketsData.push({
      studentEmail,
      subject: `${template.subject} (Case #${i})`,
      status,
      category,
      aiSummary: template.aiSummary,
      aiSuggestedReply: template.aiSuggestedReply,
      aiConfidence: parseFloat(aiConfidence.toFixed(2)),
      createdAt: createdDate,
      updatedAt: updatedDate,
      body: template.body,
    });
  }

  // Insert tickets and their messages
  for (const t of ticketsData) {
    const createdTicket = await prisma.ticket.create({
      data: {
        studentEmail: t.studentEmail,
        subject: t.subject,
        status: t.status,
        category: t.category,
        aiSummary: t.aiSummary,
        aiSuggestedReply: t.aiSuggestedReply,
        aiConfidence: t.aiConfidence,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      },
    });

    // Create the initial student message
    await prisma.message.create({
      data: {
        ticketId: createdTicket.id,
        sender: MessageSender.STUDENT,
        senderEmail: t.studentEmail,
        body: t.body,
        createdAt: t.createdAt,
      },
    });

    // Create follow-up agent/AI message for RESOLVED/CLOSED tickets
    if (t.status === TicketStatus.RESOLVED || t.status === TicketStatus.CLOSED) {
      // 70% chance of agent reply, 30% system AI
      const isAgent = Math.random() > 0.3;
      const responseSender = isAgent ? MessageSender.AGENT : MessageSender.SYSTEM_AI;
      const responseEmail = isAgent ? 'agent@helpdesk.edu' : 'ai-assistant@helpdesk.edu';
      const responseBody = isAgent 
        ? agentReplies[Math.floor(Math.random() * agentReplies.length)]
        : `[AI suggested resolution]: ${t.aiSuggestedReply}`;

      const replyDate = new Date(t.createdAt.getTime() + (1000 * 60 * 5) + Math.random() * (1000 * 60 * 60 * 4)); // 5 mins to 4 hours later

      await prisma.message.create({
        data: {
          ticketId: createdTicket.id,
          sender: responseSender,
          senderEmail: responseEmail,
          body: responseBody,
          createdAt: replyDate,
        },
      });

      // If closed, add closing note or acknowledgement
      if (t.status === TicketStatus.CLOSED && Math.random() > 0.5) {
        const closedDate = new Date(replyDate.getTime() + (1000 * 60 * 60) + Math.random() * (1000 * 60 * 60 * 24)); // 1 to 24 hours later
        await prisma.message.create({
          data: {
            ticketId: createdTicket.id,
            sender: MessageSender.STUDENT,
            senderEmail: t.studentEmail,
            body: 'Thank you! The issue is resolved, please close the ticket.',
            createdAt: closedDate,
          },
        });
      }
    }
  }

  const finalCount = await prisma.ticket.count();
  console.log(`Successfully generated and seeded ${finalCount} diverse tickets.`);
}

seedDiverseTickets()
  .catch((e) => {
    console.error('Error seeding tickets:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
