# Tech Stack

## Frontend

- **React with TypeScript** – Widely adopted, strong ecosystem for building dashboards and data-heavy UIs.
- **Tailwind CSS** – Fast styling without fighting a component library.
- **React Router** – Client-side routing.

---

## Backend

- **Node.js with Express and TypeScript** – Keeps the entire stack in one language and makes it simple to build REST APIs.
- **Database Sessions** – Use database-backed sessions for authentication instead of JWT. Store session information securely in the database using HTTP-only cookies to improve security, simplify session management, and support server-side session invalidation.

---

## Database

- **PostgreSQL** – Relational database that naturally fits tickets, users, and categories into tables with foreign keys. Well suited for filtering, sorting, searching, and relational queries.

---

## ORM

- **Prisma** – Type-safe database access, easy migrations, and excellent integration with TypeScript.

---

## AI

- **Claude API (Anthropic)** – Used for ticket classification, AI-generated summaries, and suggested replies. Provides reliable instruction following and structured output for support workflows.

---

## Email

- **SendGrid** or **Mailgun** – Used for sending outbound email replies. Incoming support emails can be received through webhooks to automatically create support tickets.

---

## Deployment

- **Docker** – Containerize the application for consistent development and deployment.
- **Cloud Provider** – Deploy using AWS, Railway, Fly.io, Render, or another cloud platform.
