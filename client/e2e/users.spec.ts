import { test, expect } from '@playwright/test';

test.describe('HelpDesk E2E Testing Suite - User Management Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('1. Admin can access user list and see stats and empty state', async ({ page }) => {
    await page.goto('/login');

    // Fill credentials
    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify Users navigation link is visible and click it
    const usersLink = page.getByRole('link', { name: 'Users', exact: true });
    await expect(usersLink).toBeVisible();
    await usersLink.click();

    // Verify we are on /users page
    await expect(page).toHaveURL(/\/users/);

    // Verify Users page title and headers
    await expect(page.locator('h2:has-text("Users")')).toBeVisible();
    await expect(page.locator('text=Name')).toBeVisible();
    await expect(page.locator('text=Email')).toBeVisible();
    await expect(page.locator('text=Role')).toBeVisible();
    await expect(page.locator('text=Created')).toBeVisible();

    // Verify default Admin user is present in the table
    await expect(page.getByRole('cell', { name: 'Admin', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'admin@example.com' })).toBeVisible();
  });

  test('2. Agent is forbidden from accessing user list page', async ({ page }) => {
    await page.goto('/login');

    // Login as Support Agent
    await page.locator('#email').fill('agent@helpdesk.edu');
    await page.locator('#password').fill('agent123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/dashboard/);

    // Verify Users navigation link is NOT visible in the sidebar
    await expect(page.getByRole('link', { name: 'Users', exact: true })).not.toBeVisible();

    // Verify direct navigation redirects back to dashboard
    await page.goto('/users');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('3. Admin can soft-delete an agent and the agent can no longer log in', async ({ page }) => {
    // 1. Admin logs in
    await page.goto('/login');
    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Go to /users and create a new agent
    await page.goto('/users');
    await expect(page.locator('h2:has-text("Users")')).toBeVisible();

    await page.getByRole('button', { name: 'Create User' }).first().click();
    await page.locator('#name-input').fill('Deletable Agent');
    await page.locator('#email-input').fill('deletable-agent@example.com');
    await page.locator('#password-input').fill('password12345');
    await page.locator('button[type="submit"]').click();

    // Verify user is in list
    await expect(page.getByRole('cell', { name: 'Deletable-agent', exact: true })).toBeVisible();

    // 3. Click delete, then cancel
    await page.getByRole('button', { name: 'Delete Deletable-agent' }).click();
    await expect(page.locator('h3:has-text("Confirm Deletion")')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('h3:has-text("Confirm Deletion")')).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Deletable-agent', exact: true })).toBeVisible();

    // 4. Click delete, then confirm
    await page.getByRole('button', { name: 'Delete Deletable-agent' }).click();
    await page.getByRole('button', { name: 'Confirm Delete' }).click();
    await expect(page.locator('h3:has-text("Confirm Deletion")')).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Deletable-agent', exact: true })).not.toBeVisible();

    // 5. Logout
    await page.locator('button:has-text("Sign Out")').first().click();
    await expect(page).toHaveURL(/\/login/);

    // 6. Try to log in as the soft-deleted agent
    await page.locator('#email').fill('deletable-agent@example.com');
    await page.locator('#password').fill('password12345');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify login fails
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=Invalid email or password.')).toBeVisible();
  });
});
