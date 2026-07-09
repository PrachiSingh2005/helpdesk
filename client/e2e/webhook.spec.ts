import { test, expect } from '@playwright/test';

// Helper to log in as default Admin
async function loginAsAdmin(page: any) {
  await page.goto('/login');
  await page.locator('#email').fill('admin@example.com');
  await page.locator('#password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('HelpDesk E2E Testing Suite - Webhook Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and localstorage to start each test fresh
    await page.context().clearCookies();
  });

  test('1. Input validation (400 Bad Request) on missing required fields', async ({ request }) => {
    // Missing 'subject' and 'text'
    const res1 = await request.post('/api/emails/inbound', {
      data: {
        from: 'student-validation@college.edu',
      },
    });
    expect(res1.status()).toBe(400);
    const body1 = await res1.json();
    expect(body1).toEqual({ error: 'Missing required email fields (from, subject, text)' });

    // Missing 'from'
    const res2 = await request.post('/api/emails/inbound', {
      data: {
        subject: 'Course overload request',
        text: 'I would like to request overloading this semester.',
      },
    });
    expect(res2.status()).toBe(400);
    const body2 = await res2.json();
    expect(body2).toEqual({ error: 'Missing required email fields (from, subject, text)' });
  });

  test('2. Ingestion of new ticket via webhook (200 OK) and UI verification', async ({ page, request }) => {
    const studentEmail = `student-${Date.now()}@college.edu`;
    const subject = `Need help with course registration ${Date.now()}`;
    const text = 'Hello, I cannot add CS 101 to my schedule. It says the class is full but there are open seats.';

    // Send inbound email via webhook
    const response = await request.post('/api/emails/inbound', {
      data: {
        from: studentEmail,
        subject,
        text,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    const ticketId = body.ticketId;
    expect(ticketId).toBeDefined();

    // Login as Admin to verify ticket queue & ticket details
    await loginAsAdmin(page);

    // Go to Ticket Queue
    await page.getByRole('link', { name: 'Ticket Queue' }).click();
    await expect(page).toHaveURL(/\/dashboard\/tickets/);

    // Verify the new ticket is present in queue list
    await expect(page.locator(`text=${subject}`).first()).toBeVisible();
    await expect(page.locator(`text=${studentEmail}`).first()).toBeVisible();

    // Navigate to ticket detail view
    await page.goto(`/dashboard/tickets/${ticketId}`);

    // Verify correct fields and student message are displayed
    await expect(page.locator(`h2:has-text("${subject}")`)).toBeVisible();
    await expect(page.locator(`text=${studentEmail}`).first()).toBeVisible();
    await expect(page.locator(`text=${text}`)).toBeVisible();
  });

  test('3. Threading / replying to an existing ticket', async ({ page, request }) => {
    const studentEmail = `student-${Date.now()}@college.edu`;
    const subject = `Registration query ${Date.now()}`;
    const text = 'How do I add a course?';

    // 1. Ingest initial ticket via webhook
    const response = await request.post('/api/emails/inbound', {
      data: {
        from: studentEmail,
        subject,
        text,
      },
    });
    expect(response.status()).toBe(200);
    const { ticketId } = await response.json();

    // 2. Log in and go to ticket detail to get ticket number
    await loginAsAdmin(page);
    await page.goto(`/dashboard/tickets/${ticketId}`);

    // Retrieve unique ticket number from details header
    const ticketHeader = page.locator('span:has-text("Ticket #")');
    await expect(ticketHeader).toBeVisible();
    const headerText = await ticketHeader.innerText();
    const match = headerText.match(/Ticket\s*#\s*(\d+)/i);
    const ticketNumber = match ? parseInt(match[1], 10) : null;
    expect(ticketNumber).not.toBeNull();

    // 3. Send threaded reply via webhook referencing the ticket number
    const replySubject = `Re: [Ticket #${ticketNumber}] ${subject}`;
    const replyText = `Wait, I found the button but it shows an error: "Access Denied"`;
    
    const replyResponse = await request.post('/api/emails/inbound', {
      data: {
        from: studentEmail,
        subject: replySubject,
        text: replyText,
        headers: {
          'message-id': `<reply-msg-id-${Date.now()}@college.edu>`,
        },
      },
    });

    expect(replyResponse.status()).toBe(200);
    const replyBody = await replyResponse.json();
    expect(replyBody.success).toBe(true);
    expect(replyBody.ticketId).toBe(ticketId); // Should route to the exact same ticket

    // 4. Reload details page and verify the reply message is listed
    await page.goto(`/dashboard/tickets/${ticketId}`);
    await expect(page.locator(`text=${replyText}`)).toBeVisible();
  });

  test('4. Re-opening resolved/closed tickets on student reply', async ({ page, request }) => {
    const studentEmail = `student-${Date.now()}@college.edu`;
    const subject = `Reopen test ${Date.now()}`;
    const text = 'Is this office open today?';

    // 1. Ingest initial ticket
    const response = await request.post('/api/emails/inbound', {
      data: {
        from: studentEmail,
        subject,
        text,
      },
    });
    const { ticketId } = await response.json();

    // 2. Log in and go to ticket detail to get ticket number
    await loginAsAdmin(page);
    await page.goto(`/dashboard/tickets/${ticketId}`);

    // Retrieve ticket number
    const ticketHeader = page.locator('span:has-text("Ticket #")');
    await expect(ticketHeader).toBeVisible();
    const headerText = await ticketHeader.innerText();
    const match = headerText.match(/Ticket\s*#\s*(\d+)/i);
    const ticketNumber = parseInt(match![1], 10);

    // 3. Resolve the ticket via the UI select dropdown
    await page.locator('select').first().selectOption('RESOLVED');
    await expect(page.locator('select').first()).toHaveValue('RESOLVED');

    // 4. Send student reply webhook targeting that resolved ticket
    const replySubject = `Re: [Ticket #${ticketNumber}] ${subject}`;
    const replyText = 'Actually, I need to know about tomorrow as well.';

    const replyResponse = await request.post('/api/emails/inbound', {
      data: {
        from: studentEmail,
        subject: replySubject,
        text: replyText,
      },
    });
    expect(replyResponse.status()).toBe(200);

    // 5. Reload the details page and verify the ticket status is reset to OPEN
    await page.goto(`/dashboard/tickets/${ticketId}`);
    await expect(page.locator('select').first()).toHaveValue('OPEN');
    await expect(page.locator(`text=${replyText}`)).toBeVisible();
  });

  test('5. Triggering AI auto-reply on high confidence keywords (e.g. "wifi")', async ({ page, request }) => {
    const studentEmail = `student-${Date.now()}@college.edu`;
    const subject = `Wifi issues in dorm ${Date.now()}`;
    // Keyword "wifi" will trigger mock high-confidence auto-reply logic
    const text = 'How can I connect to the campus secure wifi network?';

    // Ingest ticket with keyword
    const response = await request.post('/api/emails/inbound', {
      data: {
        from: studentEmail,
        subject,
        text,
      },
    });

    expect(response.status()).toBe(200);
    const { ticketId } = await response.json();

    // Log in and go to ticket detail
    await loginAsAdmin(page);
    await page.goto(`/dashboard/tickets/${ticketId}`);

    // Verify ticket was auto-resolved due to high-confidence auto-reply
    await expect(page.locator('select').first()).toHaveValue('RESOLVED');

    // Verify the AI-automated response is visible in the thread
    await expect(page.locator('text=AI Auto-Reply').first()).toBeVisible();
    await expect(page.locator('text=To connect to the campus secure Wi-Fi').first()).toBeVisible();
  });
});
