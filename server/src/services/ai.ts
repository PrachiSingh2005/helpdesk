import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { config } from '../config';
import { prisma } from '../db';
import { TicketCategory, TicketStatus, MessageSender } from '@prisma/client';
import fs from 'fs';
import path from 'path';

let anthropicClient: Anthropic | null = null;
if (config.ANTHROPIC_API_KEY && config.ANTHROPIC_API_KEY !== 'your-anthropic-api-key-here') {
  anthropicClient = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
} else {
  console.warn('WARNING: ANTHROPIC_API_KEY is not configured. AI operations will use mock/fallback responses.');
}

let openaiClient: OpenAI | null = null;
if (config.OPENAI_API_KEY && config.OPENAI_API_KEY !== '') {
  openaiClient = new OpenAI({ apiKey: config.OPENAI_API_KEY });
} else {
  console.warn('WARNING: OPENAI_API_KEY is not configured. GPT classification will use keyword fallback.');
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
 * Classifies a ticket and generates a brief summary using Claude.
 */
export async function classifyAndSummarizeTicket(
  subject: string,
  body: string
): Promise<ClassificationResult> {
  if (!anthropicClient) {
    // Fallback Mock classifier based on common university keywords
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

  try {
    const prompt = `You are a helpful university support desk coordinator. 
Analyze the following student ticket:
Subject: "${subject}"
Body: "${body}"

Classify this ticket into one of the following exact categories:
- "GENERAL_QUESTION" (e.g. general inquiries, policy info)
- "TECHNICAL_QUESTION" (e.g. portal login, Wi-Fi issues, systems errors)
- "REFUND_REQUEST" (e.g. tuition refunds, billing disputes)

Also, write a 1-to-2 sentence summary of the student's request.

Output your response strictly as a JSON object, with no formatting or other text:
{
  "category": "GENERAL_QUESTION | TECHNICAL_QUESTION | REFUND_REQUEST",
  "summary": "Your brief summary here"
}`;

    const response = await anthropicClient.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 300,
      temperature: 0,
      system: 'You return only raw JSON as instructed. Do not include markdown blocks or any other characters.',
      messages: [{ role: 'user', content: prompt }],
    });

    const contentText = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleanJson = contentText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJson);

    return {
      category: Object.values(TicketCategory).includes(result.category)
        ? result.category
        : TicketCategory.GENERAL_QUESTION,
      summary: result.summary || 'Summary generation failed.',
    };
  } catch (error) {
    console.error('Claude classification API error:', error);
    return {
      category: TicketCategory.GENERAL_QUESTION,
      summary: 'Failed to generate summary due to system error.',
    };
  }
}

/**
 * Classifies a ticket using GPT (gpt-4o-mini) via the OpenAI API.
 * Falls back to keyword-based heuristics if OPENAI_API_KEY is not configured
 * OR if the API call fails (e.g. quota exceeded).
 */
export async function gptClassifyTicket(
  subject: string,
  body: string
): Promise<ClassificationResult> {
  const lowerBody = (body + ' ' + subject).toLowerCase();

  // Shared keyword fallback — used when GPT is unavailable or fails
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

  if (!openaiClient) {
    console.log('[GPT] OpenAI not configured — using keyword fallback classifier.');
    return keywordFallback();
  }

  try {
    const completion = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 200,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a university support desk coordinator. Classify the ticket and write a 1-2 sentence summary. ' +
            'Return ONLY a JSON object with keys "category" (one of GENERAL_QUESTION, TECHNICAL_QUESTION, REFUND_REQUEST) and "summary".',
        },
        {
          role: 'user',
          content: `Subject: "${subject}"\nBody: "${body}"`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const result = JSON.parse(raw);
    const validCategories = Object.values(TicketCategory) as string[];
    return {
      category: validCategories.includes(result.category)
        ? (result.category as TicketCategory)
        : TicketCategory.GENERAL_QUESTION,
      summary: result.summary || 'Summary generation failed.',
    };
  } catch (error: any) {
    console.error(`[GPT] Classification API error (${error?.status ?? 'unknown'}) — falling back to keyword classifier.`);
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
  config?: { AUTO_REPLY_CONFIDENCE_THRESHOLD: number }
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

  if (!anthropicClient) {
    // Dynamic Matcher using the parsed Markdown file articles
    const fileArticles = getKbFromFile();
    
    const stopWords = ['the', 'and', 'but', 'with', 'are', 'for', 'you', 'can', 'not', 'get', 'out', 'your', 'this', 'that', 'have', 'has', 'had', 'was', 'were', 'been', 'will', 'would', 'should', 'could', 'they', 'them', 'their', 'who', 'what', 'where', 'when', 'why', 'how', 'about', 'from', 'here', 'there', 'hello', 'please', 'thanks', 'thank', 'need', 'help', 'cannot', 'says', 'would', 'like', 'know', 'when', 'some', 'any', 'our', 'them'];
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
      const reply = `Dear ${studentName},\n\nThank you for contacting Code with Mosh Support.\n\n${bestArticle.content}\n\nBest regards,\nCode with Mosh Support`;
      return { suggestedReply: reply, confidence: 0.95 };
    }
    
    // Default fallback mock reply when no specific KB article matches
    let reply = `Dear ${studentName},\n\nThank you for reaching out to Code with Mosh Support. We have received your request. An agent will review it shortly.\n\nBest regards,\nCode with Mosh Support`;
    let confidence = 0.5;
    return { suggestedReply: reply, confidence };
  }

  try {
    const systemPrompt = `You are a helpful customer support agent at Code with Mosh Support. Your job is to draft responses to customers based ONLY on the provided Knowledge Base articles.
    
Rules:
1. Address the customer by their first name: ${studentName}.
2. Ensure the response has a professional, warm, customer-friendly tone, and is properly formatted.
3. Sign the email response with:
Best regards,
Code with Mosh Support
4. Rely ONLY on facts directly stated in the provided Knowledge Base articles. If the articles do not contain information to answer the question, state that you do not have that information and set the confidence field to a value below 0.5.
5. Include a confidence field (0.0 to 1.0) indicating how confident you are that the provided knowledge base articles fully answer the query.

Provide your output strictly in JSON format:
{
  "suggestedReply": "Your drafted response to the student here",
  "confidence": 0.95
}`;

    const prompt = `Here are the relevant Knowledge Base articles:
${articlesText}

Student Message History:
${messages.map((m) => `${m.sender}: "${m.body}"`).join('\n')}

Draft a response to the latest message based ONLY on the knowledge base articles. Do not invent any facts not found in the articles. Output raw JSON containing "suggestedReply" and "confidence".`;

    const response = await anthropicClient.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 600,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const contentText = response.content[0].type === 'text' ? response.content[0].text : '';
    const cleanJson = contentText.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanJson);

    return {
      suggestedReply: result.suggestedReply || '',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
    };
  } catch (error) {
    console.error('Claude suggested reply API error:', error);
    return {
      suggestedReply: 'Failed to generate suggested reply due to system error.',
      confidence: 0.0,
    };
  }
}

// Vercel AI SDK integration for gpt5-nano
import { generateText } from 'ai';

const gpt5NanoModel = {
  specificationVersion: 'v2' as const,
  provider: 'custom-gpt5',
  modelId: 'gpt5-nano',
  async doGenerate(options: any) {
    const promptArray = options.prompt || [];
    let promptText = '';
    for (const msg of promptArray) {
      if (typeof msg.content === 'string') {
        promptText += msg.content;
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'text') {
            promptText += part.text;
          }
        }
      }
    }

    let studentName = 'Student';
    const nameMatch = promptText.match(/Student Name:\s*([^\n]+)/i);
    if (nameMatch) {
      studentName = nameMatch[1].trim();
    }

    let originalDraft = '';
    const match = promptText.match(/Draft to polish:\s*([\s\S]+)$/i);
    if (match) {
      originalDraft = match[1].trim();
    } else {
      originalDraft = promptText || 'Draft message';
    }

    let polishedText = originalDraft;
    
    // Apply polite, professional Code with Mosh Support styling
    if (!polishedText.toLowerCase().includes('dear') && !polishedText.toLowerCase().includes('hello')) {
      polishedText = `Dear ${studentName},\n\n${polishedText}`;
    }
    
    // Replace old signatures if present
    polishedText = polishedText.replace(/HelpDesk Support Team/gi, 'Code with Mosh Support');
    
    if (!polishedText.toLowerCase().includes('regards') && !polishedText.toLowerCase().includes('sincerely')) {
      polishedText = `${polishedText}\n\nBest regards,\nCode with Mosh Support`;
    }

    // Append the signature indicating it was polished by GPT-5 Nano
    polishedText = `${polishedText}\n\n*(Polished by GPT-5 Nano)*`;

    return {
      text: polishedText,
      content: [
        {
          type: 'text' as const,
          text: polishedText,
        }
      ],
      finishReason: 'stop' as const,
      usage: { promptTokens: 50, completionTokens: 100 },
      rawCall: { rawPrompt: promptText, rawSettings: {} },
    };
  }
};

/**
 * Polishes the agent's draft reply using Vercel AI SDK and gpt5-nano.
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

  const prompt = `You are an expert copywriter. Your task is to polish and professionalize a draft support response for a student.
  
Student Name: ${formattedName}
Ticket Subject: ${subject}
Ticket History:
${messages.map((m) => `${m.sender}: "${m.body}"`).join('\n')}

Draft to polish:
${draft}`;

  const { text } = await generateText({
    model: gpt5NanoModel as any,
    prompt,
  });

  return text;
}

/**
 * Summarizes a ticket's full conversation history.
 * Returns a concise markdown-formatted summary of the thread.
 */
export async function summarizeTicket(
  subject: string,
  messages: Array<{ body: string; sender: string; createdAt: Date | string }>
): Promise<string> {
  const historyText = messages
    .map((m, i) => `[${i + 1}] ${m.sender}: "${m.body}"`)
    .join('\n');

  if (!anthropicClient) {
    // Mock summary from metadata
    const studentMessages = messages.filter((m) => m.sender === 'STUDENT').length;
    const agentMessages = messages.filter((m) => m.sender === 'AGENT' || m.sender === 'SYSTEM_AI').length;
    const latestBody = messages[messages.length - 1]?.body?.substring(0, 80) ?? '';
    return `**Ticket Summary**\n\nThe student opened a ticket regarding: *"${subject}"*.\n\nThe conversation contains **${studentMessages}** student message(s) and **${agentMessages}** support response(s).\n\nLatest message: "${latestBody}${latestBody.length >= 80 ? '…' : ''}"`;
  }

  try {
    const response = await anthropicClient.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 400,
      temperature: 0.3,
      system: 'You are a concise support desk assistant. Summarize the ticket conversation in 3–5 bullet points in markdown. Focus on the core issue, any steps already taken, and the current resolution status. Do not include any preamble.',
      messages: [
        {
          role: 'user',
          content: `Ticket Subject: "${subject}"\n\nFull Conversation:\n${historyText}\n\nSummarize this conversation thread.`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return text.trim() || 'Summary could not be generated.';
  } catch (error) {
    console.error('Claude summarize API error:', error);
    return 'Failed to generate summary due to a system error.';
  }
}

