import { test, expect } from '@playwright/test';

test.describe('HelpDesk E2E Testing Suite - Auth Scenarios & Edge Cases', () => {

  test.beforeEach(async ({ page }) => {
    // Clear cookies and localstorage to start each test fresh
    await page.context().clearCookies();
  });

  test('1. Unauthenticated users are redirected to login', async ({ page }) => {
    // Attempt direct access to dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
    
    // Attempt direct access to users page
    await page.goto('/users');
    await expect(page).toHaveURL(/\/login/);
  });

  test('2. Admin can log in successfully and see administrative tabs', async ({ page }) => {
    await page.goto('/login');

    // Fill credentials
    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill('password123');

    // Click Sign In
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Total Tickets')).toBeVisible();

    // Verify sidebar shows admin-only tabs
    await expect(page.getByRole('link', { name: 'Manage Agents', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Users', exact: true })).toBeVisible();

    // Navigate to Users page via sidebar link
    await page.getByRole('link', { name: 'Users', exact: true }).click();
    await expect(page).toHaveURL(/\/users/);
    await expect(page.locator('h2:has-text("Users")')).toBeVisible();
  });

  test('3. Agent can log in successfully but cannot see or access admin pages', async ({ page }) => {
    await page.goto('/login');

    // Fill credentials (using seeded agent account)
    await page.locator('#email').fill('agent@helpdesk.edu');
    await page.locator('#password').fill('agent123');

    // Click Sign In
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify redirection to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Total Tickets')).toBeVisible();

    // Verify sidebar does NOT show admin-only tabs
    await expect(page.getByRole('link', { name: 'Manage Agents', exact: true })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Users', exact: true })).not.toBeVisible();

    // Verify direct access to /users redirects them back to dashboard
    await page.goto('/users');
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify direct access to /dashboard/agents redirects them back to dashboard
    await page.goto('/dashboard/agents');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('4. Session persists across page refresh', async ({ page }) => {
    await page.goto('/login');

    // Login as Admin
    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Refresh the page
    await page.reload();

    // Verify user is still logged in and on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('text=Total Tickets')).toBeVisible();
  });

  test('5. Logout clears the session and redirects to login', async ({ page }) => {
    await page.goto('/login');

    // Login
    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Click logout button (resolving multiple button matches by targeting first one)
    await page.locator('button:has-text("Sign Out")').first().click();

    // Verify redirect to login
    await expect(page).toHaveURL(/\/login/);

    // Verify trying to go to dashboard redirects to login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('6. Client-side form validation for invalid inputs', async ({ page }) => {
    await page.goto('/login');

    // Invalid email format validation
    await page.locator('#email').fill('invalidemail');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();

    // Short password validation
    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill('123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
  });

  test('7. Special characters and SQL injection payloads fail gracefully', async ({ page }) => {
    await page.goto('/login');

    // Fill credentials with injection payload in the password field (bypassing Zod email validation)
    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill("' OR '1'='1");
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify we remain on login and receive validation error from server
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('text=Invalid email or password.')).toBeVisible();
  });

});
