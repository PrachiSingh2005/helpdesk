import { test, expect } from '@playwright/test';

// Helper to log in as default Admin
async function loginAsAdmin(page: any) {
  await page.goto('/login');
  await page.locator('#email').fill('admin@example.com');
  await page.locator('#password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe('HelpDesk E2E Testing Suite - Ticket Details & Reply Thread Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('1. Agent can send a manual reply and it persists in the database and updates status', async ({ page, request }) => {
    const studentEmail = `student-${Date.now()}@college.edu`;
    const subject = `Password reset request ${Date.now()}`;
    const text = 'I am trying to reset my password but I get an error.';

    // 1. Ingest initial ticket via webhook to create it in the database
    const response = await request.post('/api/emails/inbound', {
      data: {
        from: studentEmail,
        subject,
        text,
      },
    });
    expect(response.status()).toBe(200);
    const { ticketId } = await response.json();

    // 2. Log in and go to ticket detail page
    await loginAsAdmin(page);
    await page.goto(`/dashboard/tickets/${ticketId}`);

    // 3. Draft and send manual reply
    const replyText = 'Hello student, please follow the password reset link in portal.';
    await page.locator('textarea[placeholder*="Draft your reply"]').fill(replyText);
    await page.getByRole('button', { name: 'Send Reply' }).click();

    // Verify database integration: reply is listed and ticket status updates to RESOLVED
    await expect(page.getByTestId('reply-thread')).toBeVisible();
    await expect(page.getByText(replyText)).toBeVisible();
    await expect(page.locator('select').first()).toHaveValue('RESOLVED');
  });

  test('2. Modifying ticket attributes (Status, Category, Assigned Agent) persists in database across reloads', async ({ page, request }) => {
    const studentEmail = `student-${Date.now()}@college.edu`;
    const subject = `Billing dispute ${Date.now()}`;
    const text = 'I was charged twice for lab fees.';

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

    // 2. Log in and go to ticket detail
    await loginAsAdmin(page);
    await page.goto(`/dashboard/tickets/${ticketId}`);

    // 3. Modify Status to CLOSED and wait for update
    await page.locator('select').first().selectOption('CLOSED');
    await expect(page.locator('select').first()).toHaveValue('CLOSED');

    // 4. Modify Category to GENERAL_QUESTION and wait for update
    await page.locator('select').nth(1).selectOption('GENERAL_QUESTION');
    await expect(page.locator('select').nth(1)).toHaveValue('GENERAL_QUESTION');

    // 5. Assign to Admin and wait for update
    await page.locator('#select-assigned-agent').selectOption({ label: 'Admin (ADMIN)' });
    await expect(page.locator('#select-assigned-agent')).not.toHaveValue('');
    
    // 6. Reload page to verify database persistence
    await page.reload();
    await expect(page.locator('select').first()).toHaveValue('CLOSED');
    await expect(page.locator('select').nth(1)).toHaveValue('GENERAL_QUESTION');
    await expect(page.locator('#select-assigned-agent')).not.toHaveValue('');
  });

  test('3. Applying AI Suggested Reply populates the editor and submits successfully', async ({ page, request }) => {
    const studentEmail = `student-${Date.now()}@college.edu`;
    const subject = `General help query ${Date.now()}`;
    const text = 'I would like to know when the campus library is open.';

    // 1. Ingest initial ticket
    const response = await request.post('/api/emails/inbound', {
      data: {
        from: studentEmail,
        subject,
        text,
      },
    });
    expect(response.status()).toBe(200);
    const { ticketId } = await response.json();

    // 2. Log in and go to ticket detail
    await loginAsAdmin(page);
    await page.goto(`/dashboard/tickets/${ticketId}`);

    // 3. Insert AI suggestion into editor
    await page.getByRole('button', { name: 'Insert AI Suggestion' }).click();

    // Verify textarea gets populated
    const textarea = page.locator('textarea[placeholder*="Draft your reply"]');
    await expect(textarea).not.toHaveValue('');
    const typedText = await textarea.inputValue();

    // 4. Submit and verify reply gets added to database and persists in thread
    await page.getByRole('button', { name: 'Send Reply' }).click();
    await expect(page.getByTestId('reply-thread')).toBeVisible();
    await expect(page.getByText(typedText)).toBeVisible();
  });

  test('4. Agent can polish a draft reply using Polish button and then submit it', async ({ page, request }) => {
    const studentEmail = `student-${Date.now()}@college.edu`;
    const subject = `Password reset request ${Date.now()}`;
    const text = 'I am trying to reset my password but I get an error.';

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

    // 2. Log in and go to ticket detail
    await loginAsAdmin(page);
    await page.goto(`/dashboard/tickets/${ticketId}`);

    // 3. Enter a draft reply
    const draftText = 'We will reset it for you.';
    const textarea = page.locator('textarea[placeholder*="Draft your reply"]');
    await textarea.fill(draftText);

    // 4. Click Polish button
    await page.getByRole('button', { name: 'Polish' }).click();

    // Verify editor is updated with polished version
    await expect(textarea).not.toHaveValue(draftText);
    const polishedVal = await textarea.inputValue();
    expect(polishedVal).toContain('Polished by GPT-5 Nano');

    // 5. Submit and verify reply gets added to database and persists in thread
    await page.getByRole('button', { name: 'Send Reply' }).click();
    await expect(page.getByTestId('reply-thread')).toBeVisible();
    await expect(page.getByText(polishedVal)).toBeVisible();
  });
});
