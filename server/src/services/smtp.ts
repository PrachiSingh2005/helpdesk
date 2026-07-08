import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';
import { handleInboundEmail } from '../routes/emails';

const PORT = parseInt(process.env.SMTP_PORT || (process.env.NODE_ENV === 'test' ? '2526' : '2525'), 10);

export const smtpServer = new SMTPServer({
  authOptional: true,
  disabledCommands: ['STARTTLS'], // Disable STARTTLS to allow plaintext connections locally
  onData(stream, session, callback) {
    simpleParser(stream, async (err, parsed) => {
      if (err) {
        console.error('[SMTP SERVER] Error parsing incoming email stream:', err);
        return callback(err);
      }

      try {
        const from = parsed.from?.text || '';
        const subject = parsed.subject || '(No Subject)';
        const text = parsed.text || parsed.html || '';
        
        console.log(`[SMTP SERVER] Processing inbound email connection...`);
        console.log(`  From: ${from}`);
        console.log(`  Subject: ${subject}`);
        console.log(`  Body length: ${text.length} chars`);

        // Convert the Message-ID into a formatted string to match our header parsing logic
        const messageId = parsed.messageId;
        const formattedHeaders = messageId ? `Message-ID: <${messageId}>` : undefined;

        // Route the parsed email to our ticket ingestion flow
        await handleInboundEmail({
          from,
          subject,
          text,
          headers: formattedHeaders,
        });

        console.log(`[SMTP SERVER] Inbound email successfully converted to ticket!`);
        callback();
      } catch (error: any) {
        console.error('[SMTP SERVER] Error converting inbound email to ticket:', error);
        callback(error);
      }
    });
  },
  onAuth(auth, session, callback) {
    // Accept any credentials if AUTH command is invoked
    callback(null, { user: 1 });
  },
});

export function startSMTPServer() {
  smtpServer.on('error', (err: any) => {
    console.error(`[SMTP SERVER] Failed to start local SMTP server:`, err.message);
  });

  smtpServer.listen(PORT, () => {
    console.log(`[SMTP SERVER] Local SMTP server listening on port ${PORT} (Plaintext)`);
  });
}
