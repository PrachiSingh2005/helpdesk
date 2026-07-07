# Project Memory: AI-Powered Ticket Management System

This file serves as the project memory for the AI-Powered Ticket Management System. It preserves context on architecture, database configurations, services, user credentials, and external tool integrations (like the Context7 MCP).

---

## 📋 Project Overview
- **Problem**: Support agents spend hours manually sorting and responding to emails, leading to slow and canned responses.
- **Solution**: A full-stack helpdesk system that leverages AI (Claude API) to automatically summarize, classify, and suggest replies for incoming tickets, auto-sending responses when confidence is high.
- **User Roles**: Single `ADMIN` (creates agents), and `AGENT` operators.
- **Student Channel**: Email-only (webhook ingestion and threaded email replies).

---

## 🛠️ Technology Stack
- **Frontend**: Vite + React with TypeScript, Tailwind CSS v4, Lucide React (Icons), React Router, **Axios** (HTTP client), **TanStack React Query** (data fetching), **Zod** (client-side form validation).
- **Backend**: Node.js with Express and TypeScript running on **Bun**, with **Zod** schema request body validation.
- **Database**: PostgreSQL (local instance running on version 18).
- **ORM**: Prisma v7 (configured with driver adapter `@prisma/adapter-pg` and local connection pooling).
- **AI**: Anthropic Claude API (Haiku model `claude-3-haiku-20240307`).
- **Outbound Email**: SendGrid (falls back to console log simulation in development).

---

## 📁 Directory Structure
```
d:\HelpDesk
├── client/                     # Vite + React Frontend
│   ├── src/
│   │   ├── components/         # Layout & reusable views
│   │   ├── context/            # Auth session contexts
│   │   ├── pages/              # Login, Dashboard, Tickets, KB, Agents pages
│   │   ├── utils/              # API fetch requests & types
│   │   ├── App.tsx             # Routing & auth guard rules
│   │   └── main.tsx            # Entry mount point
│   ├── index.html
│   └── package.json
│
├── server/                     # Express + TS Backend (Bun)
│   ├── prisma/
│   │   ├── schema.prisma       # Database model structures (connection URLs moved to config)
│   │   └── seed.ts             # Initial DB seeder
│   ├── src/
│   │   ├── middleware/         # Session auth validators
│   │   ├── routes/             # REST endpoints (auth, tickets, kb, stats, webhooks)
│   │   ├── services/           # PII redaction, Claude RAG, Email outbound
│   │   ├── config.ts           # Env configuration values
│   │   ├── db.ts               # Prisma Client singleton
│   │   └── index.ts            # Express server entry point
│   ├── .env                    # Environment keys
│   ├── package.json
│   └── prisma.config.ts        # Prisma 7 central configuration file
│
├── docker-compose.yml          # PostgreSQL container definition
├── project-scope.md            # Features & architecture spec
├── tech-stack.md               # Tooling and stack overview
└── claude.md                   # This Project Memory file
```

---

## 🔑 Database Credentials & Auth Seed

The database is initialized in PostgreSQL with the name `helpdesk` under port `5432` on `localhost`.
- **PostgreSQL Connection URL**: `postgresql://postgres:1234@localhost:5432/helpdesk?schema=public`

We have seeded the database with the following default credentials:

| Role | Email | Password | Source |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@example.com` | `password123` | Configured via `ADMIN_EMAIL` & `ADMIN_PASSWORD` in `.env` |
| **Support Agent** | `agent@helpdesk.edu` | `agent123` | Hardcoded seeder fallback |
| **Support Agent** | `agent@example.com` | `password123` | Manually created agent test account |

---

## 🔒 Authentication Flow Detail

### 1. Backend Custom Session Authentication
*   **Mechanism**: The server uses custom database-backed sessions instead of stateless JWTs.
*   **Token Storage**: Upon login, a secure session token is generated (`crypto.randomBytes(32)`) and saved to the `Session` model.
*   **Cookie Handling**: The session token is transmitted back to the client as an HTTP-only secure cookie named `sid`.
*   **Middleware Protection**: An Express middleware (`authMiddleware`) intercepts requests, parses `sid` cookies (or `x-session-id` headers), checks database matches, validates expiration, and attaches the parsed user profile to `req.user`.

### 2. Sign-Up Prevention
*   **Public Registration Disabled**: There are no public user registration endpoints in the Express router. Attempting `POST` requests to `/api/auth/signup` or `/api/auth/sign-up` yields `404 Not Found`.
*   **Better Auth Config**: Better Auth config in `auth.ts` explicitly restricts standard credentials registration:
    ```typescript
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
    },
    trustedOrigins: [process.env.TRUSTED_ORIGINS || "http://localhost:5173"],
    ```
*   **Admin-Only Agent Provisioning**: New support agents can only be created by an authenticated Administrator calling the `/api/agents` (POST) endpoint, which is protected by the `requireRole(Role.ADMIN)` middleware using the Prisma `Role` enum.
*   **Role Enum Enforcement**: All role assignments during user and agent creation (e.g., in `/api/users` and `/api/agents` endpoints) strictly leverage the database-generated `Role` enum (`Role.AGENT` and `Role.ADMIN` imported from `@prisma/client`) instead of hardcoded strings.

### 3. Frontend Form & Authentication Architecture
*   **Session Management**: Managed globally via `AuthContext` which queries `/api/auth/me` on initial mount to restore active cookie sessions.
*   **Form Validation Library**: Client-side forms (including `Login.tsx` and the `Users.tsx` user management panel) leverage **`react-hook-form`** and **`zod`** schema resolvers (`@hookform/resolvers/zod`) to validate inputs.
    *   **Email**: Enforces standard email formats.
    *   **Password**: Enforces minimum length constraints (minimum 6 characters on login, 8 characters on user creation).
*   **Role Protection**: Access to pages is guarded via the `<ProtectedRoute>` component which checks the user context against a typesafe `Role` enum defined in `client/src/utils/api.ts`:
    *   `Role.ADMIN`
    *   `Role.AGENT`

### 4. Admin-Only Features & Navigation Page
*   **Users Page (`/users`)**: An admin-only page containing user administration. Guarded client-side via `allowedRoles={[Role.ADMIN]}` on `<ProtectedRoute>`.
*   **Sidebar Navigation**: Added a tab labeled **"Users"** using the `UserCog` icon inside [DashboardLayout.tsx](file:///d:/HelpDesk/client/src/components/DashboardLayout.tsx) to redirect to `/users`. It is only visible when the logged-in user is an administrator.
*   **Quick Actions Panel**: Added an **"Administrator Quick Actions"** control panel in the main area of [DashboardHome.tsx](file:///d:/HelpDesk/client/src/pages/DashboardHome.tsx) when logged in as an administrator. It provides quick configuration paths to `/dashboard/agents` and `/users`.

### 5. Rate Limiting Middleware
*   **Production Context**: Rate limiting is enabled conditionally only in production environments (`NODE_ENV === 'production'`).
*   **Package**: Implemented via `express-rate-limit` with a configuration window of 15 minutes and a maximum of 100 requests per IP window.

---

## 📡 API Client & Query Management

### 1. Axios Instance
*   **Location**: [api.ts](file:///d:/HelpDesk/client/src/utils/api.ts)
*   **Configuration**: Configured with `withCredentials: true` to support HTTP-only database session cookies (`sid`).
*   **Usage**: The custom `request` wrapper translates standard method/body parameters and executes them via `axiosInstance`. All API methods under the `api` object (e.g. `api.users.list`) leverage this instance.

### 2. TanStack React Query
*   **Provider**: The app is wrapped with `QueryClientProvider` using a `QueryClient` initialized in [App.tsx](file:///d:/HelpDesk/client/src/App.tsx).
*   **Configuration**: Default query options disable `refetchOnWindowFocus` and `retry` to prevent excessive polling during development.
*   **Usage**: Components (e.g. [Users.tsx](file:///d:/HelpDesk/client/src/pages/Users.tsx)) fetch and manage remote state utilizing the typesafe `useQuery` hook.

---

## 📦 Shared Core Package & Schema Management

To avoid duplicate validation logic and mismatching error messages, the workspace is structured as a monorepo workspace containing a `core` package alongside `client` and `server`.

### 1. Structure
- `core/` contains general shared code, models, and Zod schemas (e.g. `createUserSchema`).
- `core/package.json` compiles TypeScript to `dist/` and lists `zod` as a dependency.
- Both `client` and `server` reference the local `core` package in their `dependencies` using the `"core": "workspace:*"` workspace mapping.

### 2. Instructions for Defining Zod Schemas
1. **Define Schema**: Add your Zod schema and any inferred TypeScript types in [index.ts](file:///d:/HelpDesk/core/src/index.ts). Ensure error messages are compatible with both frontend expectations (e.g., unit tests) and backend structure.
2. **Build Package**: Build the `core` package to generate compiled JS and type declarations by running:
   ```bash
   bun run build
   ```
   *(Executed inside the `d:/HelpDesk/core` directory)*
3. **Reference Schema**: Import the schema or type in your client/server files directly from `'core'`:
   ```typescript
   import { createUserSchema } from 'core';
   ```

---

## 🔌 Tool Integration: Context7 MCP
The **Context7 MCP** server is registered with the Antigravity IDE configuration to fetch live, up-to-date documentation and code reference snippets at development time.

### Configuration (`mcp_config.json`)
```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp",
        "--api-key",
        "ctx7sk-320accbb-c1fd-4e7f-97fb-98738ea11fba"
      ]
    }
  }
}
```

### How to use Context7 tools:
1. **Resolve Library ID**: Query `resolve-library-id` with `libraryName` (e.g. `react` or `prisma`) and `query` to obtain the Context7 library reference ID (e.g. `/reactjs/react.dev` or `/prisma/web`).
2. **Fetch Documentation**: Call `query-docs` with the resolved `libraryId` and the specific question/topic to retrieve raw reference markdown sections and code blocks.
