# AI-Powered Ticket Management System

## Problem

We receive hundreds of support emails daily. Our agents manually read, classify, and respond to each ticket — which is slow and leads to impersonal, canned responses.

## Solution

Build a ticket management system that uses AI to automatically classify, respond to, and route support tickets — delivering faster, more personalized responses to students while freeing up agents for complex issues.

## Features

- Receive support emails and create tickets
- Auto-generate human-friendly responses using a knowledge base
- Ticket list with filtering and sorting
- Ticket detail view
- AI-powered ticket classification
- AI summaries
- AI-suggested replies
- User management (admin only)
- Dashboard to view and manage all tickets

## Data Models & Attributes

### Ticket Statuses
- **Open**: Newly created or active tickets.
- **Resolved**: Tickets where a solution has been provided.
- **Closed**: Completed and archived tickets.

### Ticket Categories
- **General Question**: Basic inquiries, policy information, and general help.
- **Technical Question**: Issues with access, systems, or technical tools.
- **Refund Request**: Billing, payments, and financial refund queries.

## Architecture & Design Decisions

### 1. Automation Workflow (Hybrid)
- Responses matching high-confidence thresholds are sent automatically.
- Low-confidence responses are drafted and held in an agent approval queue.

### 2. User Roles & Management
- The system is deployed with a single default admin account.
- The admin can create and manage additional agent accounts.

### 3. Student Interface
- Email-only interaction model. Students submit queries and receive replies via email.
- Agents manage and respond to these threads via the web dashboard.

### 4. Knowledge Base (KB)
- A simple, built-in Markdown editor allows agents to create, update, and manage articles directly inside the web dashboard.

### 5. Privacy & Redaction
- Automatic PII redaction (e.g., student IDs, grades, phone numbers) before data is processed by the AI.
- Responses are re-hydrated with original identifiers prior to sending.
