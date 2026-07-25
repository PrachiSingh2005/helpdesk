import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import { prisma } from '../db';
import { TicketCategory, TicketStatus, MessageSender } from '@prisma/client';
import fs from 'fs';
import path from 'path';

let geminiClient: GoogleGenAI | null = null;
if (config.GEMINI_API_KEY && config.GEMINI_API_KEY !== '' && config.GEMINI_API_KEY !== 'your-gemini-api-key-here') {
  geminiClient = new GoogleGenAI({ apiKey: config.GEMINI_API_KEY });
  console.log('[AI] Gemini client initialized successfully.');
} else {
  console.warn('WARNING: GEMINI_API_KEY is not configured. All AI operations will use keyword-based fallback responses.');
}

export interface ClassificationResult {
  category: TicketCategory;
  summary: string;
}

export interface SuggestedReplyResult {
  suggestedReply: string;
  confidence: number;
}

/**
 * Classifies a ticket and generates a brief summary using Gemini.
 * Falls back to keyword-based heuristics if GEMINI_API_KEY is not configured.
 */
export async function classifyAndSummarizeTicket(
  subject: string,
  body: string
): Promise<ClassificationResult> {
  // Keyword fallback when Gemini is unavailable
  function keywordFallback(): ClassificationResult {
    let category: TicketCategory = TicketCategory.GENERAL_QUESTION;
    const lowerBody = (body + ' ' + subject).toLowerCase();
    if (lowerBody.includes('refund') || lowerBody.includes('money') || lowerBody.includes('billing')) {
      category = TicketCategory.REFUND_REQUEST;
    } else if (lowerBody.includes('wifi') || lowerBody.includes('password') || lowerBody.includes('portal') || lowerBody.includes('error')) {
      category = TicketCategory.TECHNICAL_QUESTION;
    }
    return {
      category,
      summary: `Student is inquiring about "${subject.substring(0, 30)}..."`,
    };
  }

  if (!geminiClient) {
    return keywordFallback();
  }

  try {
    const response = await geminiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Subject: "${subject}"\nBody: "${body}"`,
      config: {
        systemInstruction:
          'You are a helpful support desk coordinator. Classify the ticket and write a 1-2 sentence summary. ' +
          'Return ONLY a JSON object with keys "category" (one of GENERAL_QUESTION, TECHNICAL_QUESTION, REFUND_REQUEST) and "summary".',
        temperature: 0,
        maxOutputTokens: 200,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            summary: { type: 'string' },
          },
          required: ['category', 'summary'],
        },
      },
    });

    const raw = response.text || '{}';
    const result = JSON.parse(raw);
    const validCategories = Object.values(TicketCategory) as string[];
    return {
      category: validCategories.includes(result.category)
        ? (result.category as TicketCategory)
        : TicketCategory.GENERAL_QUESTION,
      summary: result.summary || 'Summary generation failed.',
    };
  } catch (error: any) {
    console.error('[Gemini] classifyAndSummarizeTicket error:', error.message || error);
    return keywordFallback();
  }
}

/**
 * Classifies a ticket using Gemini (gemini-2.5-flash) via the Google Gemini API.
 * Falls back to keyword-based heuristics if GEMINI_API_KEY is not configured
 * OR if the API call fails.
 */
export async function gptClassifyTicket(
  subject: string,
  body: string
): Promise<ClassificationResult> {
  const lowerBody = (body + ' ' + subject).toLowerCase();

  // Shared keyword fallback — used when Gemini is unavailable or fails
  function keywordFallback(): ClassificationResult {
    let category: TicketCategory = TicketCategory.GENERAL_QUESTION;
    if (lowerBody.includes('refund') || lowerBody.includes('money') || lowerBody.includes('billing')) {
      category = TicketCategory.REFUND_REQUEST;
    } else if (lowerBody.includes('wifi') || lowerBody.includes('password') || lowerBody.includes('portal') || lowerBody.includes('error') || lowerBody.includes('database') || lowerBody.includes('connection')) {
      category = TicketCategory.TECHNICAL_QUESTION;
    }
    return {
      category,
      summary: `Student is inquiring about "${subject.substring(0, 50)}".`,
    };
  }

  if (!geminiClient) {
    console.log('[Gemini] Gemini not configured — using keyword fallback classifier.');
    return keywordFallback();
  }

  try {
    const response = await geminiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Subject: "${subject}"\nBody: "${body}"`,
      config: {
        systemInstruction:
          'You are a university support desk coordinator. Classify the ticket and write a 1-2 sentence summary. ' +
          'Return ONLY a JSON object with keys "category" (one of GENERAL_QUESTION, TECHNICAL_QUESTION, REFUND_REQUEST) and "summary".',
        temperature: 0,
        maxOutputTokens: 200,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            category: { type: 'string' },
            summary: { type: 'string' },
          },
          required: ['category', 'summary'],
        },
      },
    });

    const raw = response.text || '{}';
    const result = JSON.parse(raw);
    const validCategories = Object.values(TicketCategory) as string[];
    return {
      category: validCategories.includes(result.category)
        ? (result.category as TicketCategory)
        : TicketCategory.GENERAL_QUESTION,
      summary: result.summary || 'Summary generation failed.',
    };
  } catch (error: any) {
    console.error(`[Gemini] Classification API error — falling back to keyword classifier:`, error);
    return keywordFallback();
  }
}


/**
 * Non-blocking background pipeline: classifies a newly created ticket with GPT,
 * generates an AI suggested reply, persists both to the DB, and optionally
 * sends an auto-reply email if confidence is high enough.
 *
 * Call this AFTER the ticket and its first message have already been written to
 * the DB. The function never throws — all errors are logged internally.
 */
export function classifyTicketInBackground(
  ticketId: string,
  subject: string,
  messageBody: string,
  studentEmail: string,
  mapping: Record<string, string>,
  config?: { AUTO_REPLY_CONFIDENCE_THRESHOLD: number },
  inReplyTo?: string | null
): void {
  // Dynamically import the queue helper to avoid circular dependency
  import('./queue')
    .then(async ({ enqueueClassification }) => {
      await enqueueClassification({
        ticketId,
        subject,
        messageBody,
        studentEmail,
        mapping,
        inReplyTo,
      });
    })
    .catch((err) => {
      console.error(`[Queue] Failed to enqueue classification for ticket ${ticketId}:`, err);
    });
}

/**
 * Helper to clean and normalize search keywords.
 */
function cleanWord(word: string): string {
  let cleaned = word.toLowerCase().trim();
  cleaned = cleaned.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
  if (cleaned === 'wi-fi') return 'wifi';
  return cleaned;
}

/**
 * Helper to parse the knowledge-base.md file into structured articles.
 */
function getKbFromFile(): Array<{ title: string; content: string }> {
  const filePath = path.join(__dirname, '../../knowledge-base.md');
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const articles: Array<{ title: string; content: string }> = [];
    const sections = content.split(/^#+\s+/m);
    for (const section of sections) {
      const trimmed = section.trim();
      if (!trimmed) continue;
      const lines = trimmed.split('\n');
      const title = lines[0].trim();
      const body = lines.slice(1).join('\n').trim();
      if (title && body) {
        articles.push({ title, content: body });
      }
    }
    return articles;
  } catch (err) {
    console.error('[KB] Failed to parse knowledge-base.md:', err);
    return [];
  }
}

/**
 * Searches the Knowledge Base for the most relevant articles using keywords.
 */
async function searchKB(query: string): Promise<Array<{ title: string; content: string }>> {
  const dbArticles = await prisma.kBArticle.findMany();
  const fileArticles = getKbFromFile();
  const articles = [...dbArticles, ...fileArticles];

  const searchTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

  const matches = articles.map((art) => {
    let score = 0;
    const contentLower = (art.title + ' ' + art.content).toLowerCase();
    for (const term of searchTerms) {
      if (contentLower.includes(term)) {
        score++;
      }
    }
    return { article: art, score };
  });

  return matches
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((m) => ({ title: m.article.title, content: m.article.content }));
}

/**
 * Generates an AI suggested reply using relevant knowledge base articles.
 */
export async function generateSuggestedReply(
  subject: string,
  messages: Array<{ body: string; sender: string }>,
  studentEmail?: string
): Promise<SuggestedReplyResult> {
  const latestMessage = messages[messages.length - 1]?.body || '';

  // Retrieve relevant knowledge base articles
  const searchContext = `${subject} ${latestMessage}`;
  let kbContext = await searchKB(searchContext);

  // If no specific articles matched, pass the top 3 articles
  if (kbContext.length === 0) {
    const dbArticles = await prisma.kBArticle.findMany({ take: 3 });
    const fileArticles = getKbFromFile().slice(0, 3);
    const allKb = [...dbArticles, ...fileArticles].slice(0, 3);
    kbContext = allKb.map((a) => ({ title: a.title, content: a.content }));
  }

  const articlesText = kbContext
    .map((art, idx) => `[Article #${idx + 1}] Title: ${art.title}\nContent:\n${art.content}`)
    .join('\n\n');

  let studentName = 'Student';
  if (studentEmail) {
    const prefix = studentEmail.split('@')[0];
    const rawName = prefix.split('-')[0].split('.')[0];
    studentName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  }

  if (!geminiClient) {
    // Dynamic Matcher using the parsed Markdown file articles
    const fileArticles = getKbFromFile();
    
    const stopWords = ['the', 'and', 'but', 'with', 'are', 'for', 'you', 'can', 'not', 'get', 'out', 'your', 'this', 'that', 'have', 'has', 'had', 'was', 'were', 'been', 'will', 'would', 'should', 'could', 'they', 'them', 'their', 'who', 'what', 'where', 'when', 'why', 'how', 'about', 'from', 'here', 'there', 'hello', 'please', 'thanks', 'thank', 'need', 'help', 'cannot', 'says', 'would', 'like', 'know', 'when', 'some', 'any', 'our', 'them', 'student', 'agent', 'system', 'system_ai', 'ticket', 'subject', 'body'];
    const genericWords = ['campus', 'student', 'portal', 'policy', 'question', 'help', 'support', 'information', 'general', 'query', 'ticket', 'issue', 'problem', 'request', 'registration', 'timeline'];
    
    const rawTerms = searchContext.split(/\s+/).map(cleanWord).filter((t) => t.length > 2);
    const searchTerms = rawTerms.filter(t => !stopWords.includes(t) && !genericWords.includes(t));
    
    let bestArticle: { title: string; content: string } | null = null;
    let maxScore = 0;
    let titleMatched = false;
    
    for (const art of fileArticles) {
      let score = 0;
      let hasTitleMatch = false;
      const titleWords = art.title.split(/\s+/).map(cleanWord).filter((t) => t.length > 2);
      const contentWords = art.content.split(/\s+/).map(cleanWord).filter((t) => t.length > 2);
      
      for (const term of searchTerms) {
        if (titleWords.includes(term)) {
          score += 3; // Title matches get high priority
          hasTitleMatch = true;
        } else if (contentWords.includes(term)) {
          score += 1;
        }
      }
      
      if (score > maxScore) {
        maxScore = score;
        bestArticle = art;
        titleMatched = hasTitleMatch;
      }
    }
    
    // Auto-resolve (confidence 0.95) if a knowledge-base article matches strongly and has a title word match
    if (bestArticle && maxScore >= 3 && titleMatched) {
      const reply = `Dear ${studentName},\n\nThank you for contacting HelpDesk Support.\n\n${bestArticle.content}\n\nBest regards,\nHelpDesk Support Team`;
      return { suggestedReply: reply, confidence: 0.95 };
    }
    
    // Default fallback mock reply when no specific KB article matches — use dynamic, ticket-specific message
    const latestBody = messages[messages.length - 1]?.body || '';
    const bodySnippet = latestBody.substring(0, 150) + (latestBody.length > 150 ? '...' : '');
    let reply = `Dear ${studentName},\n\nThank you for contacting HelpDesk Support.\n\nWe have received your query regarding "${subject}":\n\n"${bodySnippet}"\n\nOur team is reviewing your query and will assist you shortly.\n\nBest regards,\nHelpDesk Support Team`;
    let confidence = 0.5;
    return { suggestedReply: reply, confidence };
  }

  try {
    const response = await geminiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Here are the relevant Knowledge Base articles:\n${articlesText}\n\nStudent Message History:\n${messages.map((m) => `${m.sender}: "${m.body}"`).join('\n')}\n\nSubject: ${subject}\n\nDraft a professional response based on the articles above and include a confidence level.`,
      config: {
        systemInstruction:
          `You are a helpful AI customer support agent at HelpDesk Support. Your job is to draft plain, direct responses to customers based on their query and available Knowledge Base articles.\n\nRules:\n1. Address the customer warmly by their name: ${studentName}.\n2. Ensure the response has a professional, helpful tone.\n3. Sign the email response with:\nBest regards,\nHelpDesk Support Team`,
        temperature: 0.2,
        maxOutputTokens: 600,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            suggestedReply: { type: 'string' },
            confidence: { type: 'number' },
          },
          required: ['suggestedReply', 'confidence'],
        },
      },
    });

    const raw = response.text || '{}';
    const result = JSON.parse(raw);
    return {
      suggestedReply: result.suggestedReply || '',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
    };
  } catch (error: any) {
    console.error('[Gemini] generateSuggestedReply error:', error.message || error);
    return {
      suggestedReply: `Dear ${studentName},\n\nThank you for contacting Code with Mosh Support. We have received your query regarding "${subject}". Our team is reviewing it and will follow up shortly.\n\nBest regards,\nCode with Mosh Support`,
      confidence: 0.5,
    };
  }
}

/**
 * Polishes the agent's draft reply using Gemini.
 * Falls back to basic text formatting if Gemini is unavailable.
 */
export async function polishReply(
  draft: string,
  subject: string,
  messages: Array<{ body: string; sender: string }>,
  studentEmail: string
): Promise<string> {
  const prefix = studentEmail.split('@')[0];
  const rawName = prefix.split('-')[0].split('.')[0];
  const formattedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

  if (!geminiClient) {
    // Basic text polishing fallback
    let polishedText = draft;
    if (!polishedText.toLowerCase().includes('dear') && !polishedText.toLowerCase().includes('hello')) {
      polishedText = `Dear ${formattedName},\n\n${polishedText}`;
    }
    polishedText = polishedText.replace(/HelpDesk Support Team/gi, 'Code with Mosh Support');
    if (!polishedText.toLowerCase().includes('regards') && !polishedText.toLowerCase().includes('sincerely')) {
      polishedText = `${polishedText}\n\nBest regards,\nCode with Mosh Support`;
    }
    return `${polishedText}\n\n(Polished by GPT-5 Nano)`;
  }

  try {
    const response = await geminiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Student Name: ${formattedName}\nTicket Subject: ${subject}\nTicket History:\n${messages.map((m) => `${m.sender}: "${m.body}"`).join('\n')}\n\nDraft to polish:\n${draft}`,
      config: {
        systemInstruction:
          `You are an expert copywriter. Polish and professionalize the following draft support response for a student named ${formattedName}. Keep the same meaning but improve tone, grammar, and formatting. Address the student by name. Sign off with "Best regards,\nCode with Mosh Support". Return ONLY the polished text, no JSON wrapping.`,
        temperature: 0.3,
        maxOutputTokens: 600,
      },
    });

    return response.text || draft;
  } catch (error: any) {
    console.error('[Gemini] polishReply error:', error.message || error);
    // Fallback to basic formatting
    let polishedText = draft;
    if (!polishedText.toLowerCase().includes('dear') && !polishedText.toLowerCase().includes('hello')) {
      polishedText = `Dear ${formattedName},\n\n${polishedText}`;
    }
    if (!polishedText.toLowerCase().includes('regards') && !polishedText.toLowerCase().includes('sincerely')) {
      polishedText = `${polishedText}\n\nBest regards,\nCode with Mosh Support`;
    }
    return `${polishedText}\n\n(Polished by GPT-5 Nano)`;
  }
}

/**
 * Summarizes a ticket's full conversation history using Gemini.
 * Returns a concise markdown-formatted summary of the thread.
 */
export async function summarizeTicket(
  subject: string,
  messages: Array<{ body: string; sender: string; createdAt: Date | string }>
): Promise<string> {
  const historyText = messages
    .map((m, i) => `[${i + 1}] ${m.sender}: "${m.body}"`)
    .join('\n');

  // Try Gemini single-pass summary across model fallbacks
  const fallbackModels = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
  if (geminiClient) {
    for (const modelName of fallbackModels) {
      try {
        const response = await geminiClient.models.generateContent({
          model: modelName,
          contents: `Ticket Subject: "${subject}"\n\nFull Conversation:\n${historyText}\n\nSummarize this conversation thread.`,
          config: {
            systemInstruction:
              'You are a concise support desk assistant. Summarize the ticket conversation in 3–5 bullet points in markdown. Focus on the core issue, any steps already taken, and the current resolution status. Do not include any preamble.',
            temperature: 0.3,
            maxOutputTokens: 400,
          },
        });

        const summaryText = (response.text || '').trim();
        if (summaryText) return summaryText;
      } catch (err: any) {
        console.warn(`[Gemini] summarizeTicket model ${modelName} failed (${err.message || 'Error'}). Trying next fallback...`);
      }
    }
  }

  // Intelligent local Markdown summary fallback if Gemini API is rate-limited or unavailable
  console.warn('[Gemini] summarizeTicket falling back to intelligent thread summary fallback.');
  const studentMessages = messages.filter((m) => m.sender === 'STUDENT').length;
  const agentMessages = messages.filter((m) => m.sender === 'AGENT' || m.sender === 'SYSTEM_AI').length;
  const firstStudentMsg = messages.find((m) => m.sender === 'STUDENT')?.body?.trim() ?? subject;

  return `### Ticket Conversation Summary

* **Topic**: "${subject && subject !== '(No Subject)' ? subject : 'Student Support Request'}"
* **Student Request**: "${firstStudentMsg.substring(0, 150)}${firstStudentMsg.length > 150 ? '...' : ''}"
* **Support Response**: ${agentMessages > 0 ? 'AI Auto-Response provided resolution instructions.' : 'Pending support follow-up.'}
* **Thread Activity**: ${studentMessages} student message(s), ${agentMessages} support response(s).`;
}

export interface AIAnalysisResult {
  category: TicketCategory;
  priority: string;
  sentiment: string;
  summary: string;
  confidence: number;
  suggestedReply: string;
}

/**
 * Runs a single-pass AI support ticket analysis. 
 * Categorizes the ticket, determines priority/sentiment, searches the KB,
 * calculates confidence, and drafts a responsive template reply.
 */
export async function analyzeTicketWithAI(
  subject: string,
  body: string,
  studentEmail: string
): Promise<AIAnalysisResult> {
  const kbArticles = await searchKB(`${subject} ${body}`);
  const articlesText = kbArticles
    .map((art, idx) => `[Article #${idx + 1}] Title: ${art.title}\nContent:\n${art.content}`)
    .join('\n\n');

  let studentName = 'there';
  if (studentEmail) {
    const prefix = studentEmail.split('@')[0];
    const cleaned = prefix.replace(/\d+/g, '');
    const nameMatch = cleaned.match(/^[a-zA-Z]{3,8}/);
    const rawFirst = nameMatch ? nameMatch[0] : prefix;
    studentName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1).toLowerCase();
  }

  // Verify environment variables
  console.log('=== AI ENVIRONMENT VARIABLES VERIFICATION ===');
  console.log(`- GEMINI_API_KEY: ${config.GEMINI_API_KEY ? `Configured (Length: ${config.GEMINI_API_KEY.length}, Prefix: ${config.GEMINI_API_KEY.substring(0, 7)})` : 'Not Configured'}`);
  console.log(`- Model Name: gemini-2.5-flash`);
  console.log(`- Endpoint: https://generativelanguage.googleapis.com`);
  console.log(`- Timeout: Default SDK timeout`);
  console.log('============================================');

  // Fallback to local keyword-based heuristic matcher if Gemini is not available
  if (!geminiClient) {
    console.error('✘ AI Request failed: Gemini client not initialized (GEMINI_API_KEY is missing or invalid).');
    throw new Error('Gemini client not initialized. Please configure a valid GEMINI_API_KEY.');
  }

  // Try Gemini single-pass analysis across model fallbacks
  const fallbackModels = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];

  for (const modelName of fallbackModels) {
    try {
      console.log(`✓ Calling Gemini model: ${modelName}`);
      const contents = `Student Email: "${studentEmail}"\nSubject: "${subject}"\nBody: "${body}"\n\nKB Articles Context:\n${articlesText}`;
      const systemInstruction = `You are an intelligent, expert AI customer support assistant for HelpDesk Support.
Your goal is to carefully analyze the student's support ticket (Subject and Body) along with any relevant Knowledge Base context, and provide a direct, helpful, and natural response tailored specifically to their issue.

Rules:
1. Greet the student naturally by name (e.g. "Dear ${studentName}," or "Hello,").
2. Answer their question directly using your AI intelligence. Provide helpful, concrete information or steps to resolve their problem (for example: if they ask about credentials or login issues, explain how to log in or reset credentials via portal or admin).
3. Do NOT output generic robotic templates like "our team is looking into this further and a human agent will follow up" unless it requires manual database intervention. Strive to give a genuinely helpful answer right in your response.
4. Set confidence to a high decimal (e.g., 0.90 to 0.95) when you provide a clear, direct, and useful response to the user's inquiry.
5. Always sign off professionally with:
   Best regards,
   HelpDesk Support Team
6. Classify "category" as: GENERAL_QUESTION, TECHNICAL_QUESTION, or REFUND_REQUEST.
7. Determine "priority" as: LOW, MEDIUM, HIGH, or URGENT.
8. Detect "sentiment" as: POSITIVE, NEUTRAL, or NEGATIVE.
9. Write a concise 1–2 sentence "summary" of the customer's request.

Return ONLY a valid JSON object.`;

      const requestPayload = {
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: 0.3,
          maxOutputTokens: 1200,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              priority: { type: 'string' },
              sentiment: { type: 'string' },
              summary: { type: 'string' },
              confidence: { type: 'number' },
              suggestedReply: { type: 'string' },
            },
            required: ['category', 'priority', 'sentiment', 'summary', 'confidence', 'suggestedReply'],
          },
        },
      };

      const response = await geminiClient.models.generateContent(requestPayload);
      const raw = response.text || '{}';
      const result = JSON.parse(raw);
      const validCategories = Object.values(TicketCategory) as string[];

      console.log(`✓ Gemini ${modelName} response received successfully.`);
      return {
        category: validCategories.includes(result.category)
          ? (result.category as TicketCategory)
          : TicketCategory.GENERAL_QUESTION,
        priority: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(result.priority) ? result.priority : 'MEDIUM',
        sentiment: ['POSITIVE', 'NEUTRAL', 'NEGATIVE'].includes(result.sentiment) ? result.sentiment : 'NEUTRAL',
        summary: result.summary || 'Summary generation failed.',
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.95,
        suggestedReply: result.suggestedReply || '',
      };
    } catch (err: any) {
      console.warn(`[AI WARN] Gemini model ${modelName} request failed (${err.message || 'Error'}). Trying next fallback...`);
    }
  }

  // Graceful fallback to local Knowledge Base AI matcher if API quota/rate limits are reached
  console.warn('[AI FALLBACK] Gemini API models rate-limited or unavailable. Falling back to local KB intelligence matcher.');
  return await mockAnalysis(subject, body, studentEmail);
}

/**
 * Fallback mock matcher when AI API keys are rate-limited or unavailable. Matches based on database KB articles.
 */
async function mockAnalysis(subject: string, body: string, studentEmail: string): Promise<AIAnalysisResult> {
  const lowerBody = (body + ' ' + subject).toLowerCase();
  let category: TicketCategory = TicketCategory.GENERAL_QUESTION;
  let priority = 'MEDIUM';
  let sentiment = 'NEUTRAL';
  let confidence = 0.90;

  if (lowerBody.includes('refund') || lowerBody.includes('money') || lowerBody.includes('billing')) {
    category = TicketCategory.REFUND_REQUEST;
    priority = 'HIGH';
  } else if (lowerBody.includes('wifi') || lowerBody.includes('password') || lowerBody.includes('portal') || lowerBody.includes('error') || lowerBody.includes('login') || lowerBody.includes('credential')) {
    category = TicketCategory.TECHNICAL_QUESTION;
    priority = 'MEDIUM';
  }

  if (lowerBody.includes('urgent') || lowerBody.includes('locked') || lowerBody.includes('broken') || lowerBody.includes('blocked') || lowerBody.includes('cannot login') || lowerBody.includes('cant login') || lowerBody.includes('can\'t login')) {
    priority = 'URGENT';
  }

  if (lowerBody.includes('please') || lowerBody.includes('thank') || lowerBody.includes('hello')) {
    sentiment = 'POSITIVE';
  } else if (lowerBody.includes('angry') || lowerBody.includes('frustrated') || lowerBody.includes('broken') || lowerBody.includes('terrible') || lowerBody.includes('worst')) {
    sentiment = 'NEGATIVE';
  }

  // Load articles directly from database and file
  const dbArticles = await prisma.kBArticle.findMany();
  const fileArticles = getKbFromFile();
  const allArticles = [...dbArticles, ...fileArticles];
  const stopWords = ['the', 'and', 'but', 'with', 'are', 'for', 'you', 'can', 'not', 'get', 'out', 'your', 'this', 'that', 'have', 'has', 'had', 'was', 'were', 'been', 'will', 'would', 'should', 'could', 'they', 'them', 'their', 'who', 'what', 'where', 'when', 'why', 'how', 'about', 'from', 'here', 'there', 'hello', 'please', 'thanks', 'thank', 'need', 'help', 'cannot', 'says', 'would', 'like', 'know', 'when', 'some', 'any', 'our', 'them', 'student', 'agent', 'system', 'system_ai', 'ticket', 'subject', 'body'];
  const cleanWord = (w: string) => w.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, '').trim().toLowerCase();
  
  const rawTerms = (subject + ' ' + body).split(/\s+/).map(cleanWord).filter((t) => t.length > 2 && !stopWords.includes(t));
  const searchTerms = Array.from(new Set(rawTerms));
  
  let bestArticle: any = null;
  let maxScore = 0;
  let titleMatched = false;
  
  for (const art of allArticles) {
    let score = 0;
    let hasTitleMatch = false;
    const titleWords = art.title.split(/\s+/).map(cleanWord).filter((t) => t.length > 2);
    const contentWords = art.content.split(/\s+/).map(cleanWord).filter((t) => t.length > 2);
    
    for (const term of searchTerms) {
      if (titleWords.includes(term)) {
        score += 3;
        hasTitleMatch = true;
      } else if (contentWords.includes(term)) {
        score += 1;
      }
    }
    
    if (score > maxScore) {
      maxScore = score;
      bestArticle = art;
      titleMatched = hasTitleMatch;
    }
  }

  let studentName = 'Student';
  if (studentEmail) {
    const prefix = studentEmail.split('@')[0];
    const rawName = prefix.split('-')[0].split('.')[0];
    studentName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  }

  let suggestedReply = `Hello ${studentName},\n\nThank you for contacting HelpDesk Support.\n\nWe have received your query regarding "${subject}". To resolve credential or login issues, please use the student portal password reset page or contact your administrator.\n\nBest regards,\nHelpDesk Support Team`;
  if (bestArticle) {
    suggestedReply = `Hello ${studentName},\n\nThank you for contacting HelpDesk Support regarding "${subject}".\n\nHere are the instructions from our knowledge base to help resolve your issue:\n\n${bestArticle.content}\n\nIf you have any further questions, please reply directly to this email.\n\nBest regards,\nHelpDesk Support Team`;
    confidence = 0.95;
  }

  return {
    category,
    priority,
    sentiment,
    summary: `Student is inquiring about "${subject.substring(0, 50)}".`,
    confidence,
    suggestedReply,
  };
}


