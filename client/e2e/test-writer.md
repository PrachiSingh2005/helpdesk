# Testing & Playwright Configuration

This document contains instructions and details regarding the end-to-end testing setup for the HelpDesk project.

*   **Test Database (`helpdesk_test`)**: An isolated PostgreSQL database configured specifically for E2E tests. Created, migrated, and seeded with mock datasets using Prisma.
*   **Database Override (`TEST_DATABASE_URL`)**: Set inside [server/.env](file:///d:/HelpDesk/server/.env) and [server/.env.test](file:///d:/HelpDesk/server/.env.test). Setting `NODE_ENV=test` triggers [config.ts](file:///d:/HelpDesk/server/src/config.ts) to override the connection parameter `DATABASE_URL` with `TEST_DATABASE_URL` to prevent tests from modifying development data.
*   **Playwright Config**: Located at [playwright.config.ts](file:///d:/HelpDesk/client/playwright.config.ts), it initiates a dual isolated test environment on run:
    1. Backend server booted on port `5001` with `NODE_ENV=test`.
    2. Vite client booted on port `5174` with `BACKEND_PORT=5001` (to proxy queries to the test backend).
*   **Scripts**: Added E2E running scripts to [package.json](file:///d:/HelpDesk/client/package.json) (`test:e2e` and `test:e2e-ui`).
