import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { config } from './config';
import { authMiddleware } from './middleware/auth';
import { initQueue, stopQueue } from './services/queue';

// Router imports
import authRoutes from './routes/auth';
import agentRoutes from './routes/agents';
import ticketRoutes from './routes/tickets';
import kbRoutes from './routes/kb';
import emailRoutes from './routes/emails';
import dashboardRoutes from './routes/dashboard';
import userRoutes from './routes/users';

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
app.use(
  cors({
    origin: config.CLIENT_URL,
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


// Global Error Handler Middleware
import { errorHandler } from './middleware/error';
app.use(errorHandler);

// Server Status / Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start Server
const PORT = config.PORT;
import { startSMTPServer } from './services/smtp';

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`HelpDesk Backend Services Started Successfully!  `);
  console.log(`Local Access: http://localhost:${PORT}            `);
  console.log(`Cross-Origin Resource Sharing (CORS): ${config.CLIENT_URL}`);
  console.log(`=================================================`);
  
  // Start local SMTP server for inbound email testing
  startSMTPServer();

  // Start pg-boss background queue
  initQueue().catch((err) => console.error('Failed to initialize job queue:', err));
});

// Clean shutdown handlers
const shutdown = async () => {
  console.log('Shutting down server...');
  await stopQueue();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
