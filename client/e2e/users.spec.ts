import { test, expect } from '@playwright/test';

test.describe('HelpDesk E2E Testing Suite - User Management Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('1. Admin can read user list and see existing seeded users', async ({ page }) => {
    // Login as Admin
    await page.goto('/login');
    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Navigate to Users
    await page.getByRole('link', { name: 'Users', exact: true }).click();
    await expect(page).toHaveURL(/\/users/);

    // Verify Users page title and headers
    await expect(page.locator('h2:has-text("Users")')).toBeVisible();

    // Verify default seeded Admin user is present in the table (Read)
    await expect(page.getByRole('cell', { name: 'Admin', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'admin@example.com' })).toBeVisible();
  });

  test('2. Admin can perform complete CRUD operations on a user', async ({ page }) => {
    // 1. Admin logs in
    await page.goto('/login');
    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Go to /users
    await page.goto('/users');
    await expect(page.locator('h2:has-text("Users")')).toBeVisible();

    // --- CREATE ---
    // Open create user modal
    await page.getByRole('button', { name: 'Create User' }).first().click();
    await page.locator('#name-input').fill('Crud User');
    await page.locator('#email-input').fill('crud-user@example.com');
    await page.locator('#password-input').fill('password12345');
    await page.locator('button[type="submit"]').click();

    // --- READ ---
    // Verify user is in list (Name is formatted dynamically as Capitalized prefix)
    await expect(page.getByRole('cell', { name: 'Crud-user', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'crud-user@example.com', exact: true })).toBeVisible();

    // --- UPDATE ---
    // Open edit user modal
    await page.getByRole('button', { name: 'Edit Crud-user' }).click();
    await expect(page.locator('h3:has-text("Edit User")')).toBeVisible();

    // Edit user info
    await page.locator('#name-input').fill('Updated Crud User');
    await page.locator('#email-input').fill('crud-updated@example.com');
    // Submit changes
    await page.locator('button[type="submit"]').click();

    // Verify old values are gone and updated values are present (Read after Update)
    await expect(page.getByRole('cell', { name: 'Crud-user', exact: true })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'crud-user@example.com', exact: true })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Crud-updated', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'crud-updated@example.com', exact: true })).toBeVisible();

    // --- DELETE ---
    // Click delete button
    await page.getByRole('button', { name: 'Delete Crud-updated' }).click();
    await expect(page.locator('h3:has-text("Confirm Deletion")')).toBeVisible();

    // Confirm deletion
    await page.getByRole('button', { name: 'Confirm Delete' }).click();

    // Verify user is removed from list (Read after Delete)
    await expect(page.locator('h3:has-text("Confirm Deletion")')).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'Crud-updated', exact: true })).not.toBeVisible();
    await expect(page.getByRole('cell', { name: 'crud-updated@example.com', exact: true })).not.toBeVisible();
  });
});
