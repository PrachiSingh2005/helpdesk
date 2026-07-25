import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import path from 'path';
import { config } from './config';
import { authMiddleware } from './middleware/auth';
import { initQueue, stopQueue } from './services/queue';
import { startIMAPListener, stopIMAPListener } from './services/imapListener';
import { prisma } from './db';

// Router imports
import authRoutes from './routes/auth';
import agentRoutes from './routes/agents';
import ticketRoutes from './routes/tickets';
import kbRoutes from './routes/kb';
import emailRoutes from './routes/emails';
import dashboardRoutes from './routes/dashboard';
import userRoutes from './routes/users';
import settingsRoutes from './routes/settings';

const app = express();


// Rate Limiting only in Production Environment
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per 15 minutes
    standardHeaders: 'draft-6',
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  });
  app.use(limiter);
}

// Standard Middlewares
const allowedOrigins = [config.CLIENT_URL];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin requests (origin is undefined) or matches config/railway domain
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.railway.app') || origin.endsWith('.vercel.app') || origin === 'null') {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true, // Crucial for cross-origin session cookies
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Custom Database Session Authentication Middleware
app.use(authMiddleware);

// Endpoint Registration
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/kb', kbRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);

// Serve client static assets in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));
  
  // Catch-all route to serve the single-page app (React Router) index.html
  app.get('*', (req, res, next) => {
    // Only serve index.html for page routes (not API or health routes)
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}


// Global Error Handler Middleware
import { errorHandler } from './middleware/error';
app.use(errorHandler);

// Server Status / Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Backend is running'
  });
});

// Start Server
const PORT = config.PORT;
import { startSMTPServer } from './services/smtp';

app.listen(PORT, async () => {
  console.log(`=================================================`);
  console.log(`HelpDesk Backend Services Started Successfully!  `);
  console.log(`Local Access: http://localhost:${PORT}            `);
  console.log(`Cross-Origin Resource Sharing (CORS): ${config.CLIENT_URL}`);
  console.log(`=================================================`);
  
  // Ensure stored function for dashboard stats exists in the database
  try {
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION get_dashboard_stats()
      RETURNS JSON AS $$
      DECLARE
        result JSON;
        total_count INT;
        open_count INT;
        resolved_count INT;
        closed_count INT;
        general_count INT;
        technical_count INT;
        refund_count INT;
        auto_resolved INT;
        manual_resolved INT;
        avg_confidence FLOAT;
        avg_resolution_time_min INT;
        daily_stats_json JSON;
      BEGIN
        -- 1. Total count
        SELECT COUNT(*)::INT INTO total_count FROM "Ticket";

        -- 2. Status counts
        SELECT COUNT(*)::INT INTO open_count FROM "Ticket" WHERE "status" = 'OPEN';
        SELECT COUNT(*)::INT INTO resolved_count FROM "Ticket" WHERE "status" = 'RESOLVED';
        SELECT COUNT(*)::INT INTO closed_count FROM "Ticket" WHERE "status" = 'CLOSED';

        -- 3. Category counts
        SELECT COUNT(*)::INT INTO general_count FROM "Ticket" WHERE "category" = 'GENERAL_QUESTION';
        SELECT COUNT(*)::INT INTO technical_count FROM "Ticket" WHERE "category" = 'TECHNICAL_QUESTION';
        SELECT COUNT(*)::INT INTO refund_count FROM "Ticket" WHERE "category" = 'REFUND_REQUEST';

        -- 4. Auto vs manual resolved (for tickets in RESOLVED or CLOSED status)
        SELECT COUNT(*)::INT INTO auto_resolved
        FROM "Ticket" t
        WHERE t."status" IN ('RESOLVED', 'CLOSED')
          AND (
            t."assignedToId" = (SELECT "id" FROM "User" WHERE "email" = 'ai@helpdesk.edu' LIMIT 1)
            OR NOT EXISTS (
              SELECT 1 FROM "Message" m
              WHERE m."ticketId" = t."id" AND m."sender" = 'AGENT'
            )
          );

        SELECT COUNT(*)::INT INTO manual_resolved
        FROM "Ticket" t
        WHERE t."status" IN ('RESOLVED', 'CLOSED')
          AND EXISTS (
            SELECT 1 FROM "Message" m
            WHERE m."ticketId" = t."id" AND m."sender" = 'AGENT'
          );

        -- 5. Avg confidence
        SELECT COALESCE(AVG(t."aiConfidence"), 0.0)::FLOAT INTO avg_confidence
        FROM "Ticket" t
        WHERE t."aiConfidence" IS NOT NULL;

        -- 6. Avg resolution time in minutes
        SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (t."updatedAt" - t."createdAt")) / 60)), 0)::INT INTO avg_resolution_time_min
        FROM "Ticket" t
        WHERE t."status" IN ('RESOLVED', 'CLOSED');

        -- 7. Daily stats for the past 30 days
        WITH last_30_days AS (
          SELECT gs::date AS d
          FROM generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day'::interval) gs
        ),
        daily_counts AS (
          SELECT t."createdAt"::date AS d, COUNT(*) AS count
          FROM "Ticket" t
          WHERE t."createdAt" >= CURRENT_DATE - INTERVAL '29 days'
          GROUP BY t."createdAt"::date
        )
        SELECT json_agg(json_build_object('date', to_char(last_30_days.d, 'YYYY-MM-DD'), 'count', COALESCE(daily_counts.count, 0)::INT) ORDER BY last_30_days.d)
        INTO daily_stats_json
        FROM last_30_days
        LEFT JOIN daily_counts ON last_30_days.d = daily_counts.d;

        -- Build final JSON result
        result := json_build_object(
          'totalTickets', total_count,
          'statusStats', json_build_object(
            'OPEN', open_count,
            'RESOLVED', resolved_count,
            'CLOSED', closed_count
          ),
          'categoryStats', json_build_object(
            'GENERAL_QUESTION', general_count,
            'TECHNICAL_QUESTION', technical_count,
            'REFUND_REQUEST', refund_count
          ),
          'aiMetrics', json_build_object(
            'autoResolved', auto_resolved,
            'manualResolved', manual_resolved,
            'avgConfidence', avg_confidence,
            'avgResolutionTimeMin', avg_resolution_time_min
          ),
          'dailyStats', daily_stats_json
        );

        RETURN result;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('[Database] Stored function get_dashboard_stats() created/updated.');
  } catch (err) {
    console.error('Failed to register stored function:', err);
  }

  // Start local SMTP server for inbound email testing
  startSMTPServer();

  // Start pg-boss background queue
  initQueue().catch((err) => console.error('Failed to initialize job queue:', err));

  // Start Gmail IMAP polling daemon
  startIMAPListener();
});

// Clean shutdown handlers
const shutdown = async () => {
  console.log('Shutting down server...');
  stopIMAPListener();
  await stopQueue();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
