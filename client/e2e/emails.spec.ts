import { test, expect } from '@playwright/test';
import net from 'net';

// Helper to send a raw SMTP email over TCP to localhost:2526
function sendRawSmtpEmail(
  port: number,
  from: string,
  to: string,
  subject: string,
  body: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, 'localhost');
    let step = 0;
    let dataBuffer = '';

    // Set a timeout to prevent hanging
    socket.setTimeout(5000);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('SMTP Connection timed out'));
    });

    socket.on('data', (data) => {
      const response = data.toString();
      dataBuffer += response;

      if (response.startsWith('220') && step === 0) {
        socket.write('EHLO localhost\r\n');
        step = 1;
      } else if (response.startsWith('250') && step === 1) {
        socket.write(`MAIL FROM:<${from}>\r\n`);
        step = 2;
      } else if (response.startsWith('250') && step === 2) {
        socket.write(`RCPT TO:<${to}>\r\n`);
        step = 3;
      } else if (response.startsWith('250') && step === 3) {
        socket.write('DATA\r\n');
        step = 4;
      } else if (response.startsWith('354') && step === 4) {
        socket.write(`From: ${from}\r\nTo: ${to}\r\nSubject: ${subject}\r\n\r\n${body}\r\n.\r\n`);
        step = 5;
      } else if (response.startsWith('250') && step === 5) {
        socket.write('QUIT\r\n');
        step = 6;
      } else if (response.startsWith('221') && step === 6) {
        socket.end();
        resolve(dataBuffer);
      }
    });

    socket.on('error', (err) => {
      reject(err);
    });
  });
}

test.describe('HelpDesk E2E Testing Suite - Inbound Email Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('1. Admin can compose and send simulated email via Web Simulator', async ({ page }) => {
    // Login as Admin
    await page.goto('/login');
    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Click on Email Simulator sidebar link
    await page.getByRole('link', { name: 'Email Simulator' }).click();
    await expect(page).toHaveURL(/\/dashboard\/email-simulator/);

    // Compose a mock student email
    await page.locator('input[type="email"]').fill('simulator-student@college.edu');
    await page.locator('input[placeholder*="Password Reset Request"]').fill('WiFi problems in dorm lobby');
    await page.locator('textarea').fill('Hi, the WiFi in the freshman dorm lobby disconnects every 5 minutes. Can you please check the router?');
    
    // Send email
    await page.getByRole('button', { name: 'Send Email' }).click();

    // Verify success banner and action buttons
    await expect(page.locator('text=Email Delivered & Ticket Created!')).toBeVisible();
    
    // Click View Ticket
    await page.getByRole('button', { name: 'View Ticket' }).click();

    // Verify we are redirected to the ticket details and fields are correct
    await expect(page).toHaveURL(/\/dashboard\/tickets\/[a-f0-9-]+/);
    await expect(page.locator('h2:has-text("WiFi problems in dorm lobby")')).toBeVisible();
    await expect(page.locator('text=simulator-student@college.edu').first()).toBeVisible();
    await expect(page.locator('text=Freshman dorm lobby disconnects')).toBeVisible();
  });

  test('2. Local SMTP server successfully ingests incoming raw SMTP mail', async ({ page }) => {
    // Send raw email via SMTP protocol
    const smtpFrom = 'smtp-student@college.edu';
    const smtpSubject = 'Library printing query';
    const smtpBody = 'Hello, can anyone print to the library printers from a personal laptop?';

    await sendRawSmtpEmail(2526, smtpFrom, 'support@helpdesk.edu', smtpSubject, smtpBody);

    // Login as Admin to verify ticket is present in queue
    await page.goto('/login');
    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Go to Ticket Queue
    await page.getByRole('link', { name: 'Ticket Queue' }).click();
    await expect(page).toHaveURL(/\/dashboard\/tickets/);

    // Verify the SMTP created ticket is present in the list
    await expect(page.locator(`text=${smtpSubject}`).first()).toBeVisible();
    await expect(page.locator(`text=${smtpFrom}`).first()).toBeVisible();
  });
});
