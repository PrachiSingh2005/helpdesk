# 🚀 Deploying HelpDesk to Railway

This document outlines the step-by-step instructions to deploy this Bun-based HelpDesk monorepo to **Railway**.

By following these instructions, the entire application (both the React client and the Express backend) will be built and served as a **single, unified service**, simplifying network routing, eliminating CORS issues, and keeping hosting costs minimal.

---

## 📁 How the Deployment Works

1.  **Monorepo Workspaces**: Railway detects the root `package.json` and runs `bun install` to download dependencies for the workspaces (`client`, `server`, and `core`).
2.  **Integrated Build Phase**: The root build script:
    *   Compiles the Vite client into `client/dist`.
    *   Generates the Prisma client library.
3.  **Automatic Database Operations**: During startup, the server automatically executes:
    *   `prisma migrate deploy` (runs migrations).
    *   `prisma db seed` (seeds the database with default accounts and knowledge base articles).
4.  **Static Serving**: The Express server acts as both the REST API provider and hosts the client assets statically in production (`NODE_ENV=production`).

---

## 🛠️ Step-by-Step Deployment Steps

### 1. Link Your Git Repository to Railway
1.  Go to the [Railway Dashboard](https://railway.app) and log in.
2.  Click **New Project** -> **Deploy from GitHub repo**.
3.  Select your repository containing this project.

### 2. Add a PostgreSQL Database Plugin
1.  In your new Railway project workspace, click **+ New** -> **Database** -> **Add PostgreSQL**.
2.  Railway will spin up a Postgres database and automatically expose the connection string under the `DATABASE_URL` environment variable to the main service.

### 3. Configure Service Variables
Click on your main project service in Railway, navigate to the **Variables** tab, and add the following variables:

| Variable Name | Recommended Value / Description |
| :--- | :--- |
| **`NODE_ENV`** | `production` *(Enables rate-limiting and static client hosting)* |
| **`PORT`** | `5000` *(Or leave blank; Railway injects this automatically)* |
| **`SESSION_SECRET`** | *Provide a long, random secure string* |
| **`BETTER_AUTH_SECRET`** | *Provide a long, random secure string* |
| **`CLIENT_URL`** | `https://your-custom-domain.up.railway.app` *(Your Railway public URL)* |
| **`BETTER_AUTH_URL`** | `https://your-custom-domain.up.railway.app` *(Matches your CLIENT_URL)* |
| **`TRUSTED_ORIGINS`** | `https://your-custom-domain.up.railway.app` *(Matches your CLIENT_URL)* |
| **`ADMIN_EMAIL`** | `admin@example.com` *(Default administrator login)* |
| **`ADMIN_PASSWORD`** | *Provide a secure password for the admin account* |
| **`ANTHROPIC_API_KEY`** | *Your Anthropic Claude API Key (Required for AI summaries and replies)* |
| **`SENDGRID_API_KEY`** | *Your SendGrid key (Optional; required for email replies)* |
| **`EMAIL_FROM`** | `support@yourdomain.com` *(Sender address for outbound emails)* |

### 4. Enable Public Networking
1.  Navigate to the **Settings** tab of your main service in Railway.
2.  Under **Networking**, click **Generate Domain** (or link a custom domain).
3.  Ensure the generated domain URL matches your configured `CLIENT_URL` and `BETTER_AUTH_URL` values.

---

## 🔄 Updating and Re-deploying
Whenever you push changes to your linked Git branch:
*   Railway will automatically trigger a new deployment.
*   It will run the updated bundle build.
*   It will check and run any new Prisma database migrations and ensure standard seed records exist.
