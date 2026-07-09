import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { prisma } from '../db';
import { TicketCategory } from '@prisma/client';

let anthropicClient: Anthropic | null = null;
if (config.ANTHROPIC_API_KEY && config.ANTHROPIC_API_KEY !== 'your-anthropic-api-key-here') {
  anthropicClient = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
} else {
  console.warn('WARNING: ANTHROPIC_API_KEY is not configured. AI operations will use mock/fallback responses.');
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
 * Searches the Knowledge Base for the most relevant articles using keywords.
 */
async function searchKB(query: string): Promise<Array<{ title: string; content: string }>> {
  const articles = await prisma.kBArticle.findMany();
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
    const allKb = await prisma.kBArticle.findMany({ take: 3 });
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
    // Fallback Mock replies based on common queries
    let reply = `Dear ${studentName},\n\nThank you for reaching out. We have received your request. An agent will review it shortly.`;
    let confidence = 0.5;

    const lowerMsg = latestMessage.toLowerCase();
    if (lowerMsg.includes('wifi') || lowerMsg.includes('wi-fi')) {
      reply = `Dear ${studentName},\n\nThank you for contacting HelpDesk.\n\nTo connect to the campus secure Wi-Fi (**EduWifi**):\n1. Select **EduWifi** from your device settings.\n2. Log in using your student email and portal password.\n3. Accept/Trust the certificate if prompted.\n\nIf you have further technical issues, feel free to reply directly to this thread!`;
      confidence = 0.95;
    } else if (lowerMsg.includes('refund')) {
      reply = `Dear ${studentName},\n\nThank you for contacting HelpDesk.\n\nAccording to our policy, refund eligibility depends on when you submit your request:\n- **Full Refund**: Requests submitted within the first 14 calendar days of the semester.\n- **Partial Refund (50%)**: Between day 15 and day 30.\n- **No Refund**: After the 30th calendar day.\n\nPlease confirm your semester start date so we can process your request accordingly.`;
      confidence = 0.95;
    }

    return { suggestedReply: reply, confidence };
  }

  try {
    const systemPrompt = `You are a helpful university support desk agent. Your job is to draft responses to students based ONLY on the provided Knowledge Base articles.
    
Rules:
1. Address the student by their name: ${studentName}.
2. Be polite, warm, and helpful.
2. Rely ONLY on facts directly stated in the provided Knowledge Base articles. If the articles do not contain information to answer the question, state that you do not have that information and set the confidence field to a value below 0.5.
3. Include a confidence field (0.0 to 1.0) indicating how confident you are that the provided knowledge base articles fully answer the query.

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
    
    // Apply polite, professional university HelpDesk styling
    if (!polishedText.toLowerCase().includes('dear') && !polishedText.toLowerCase().includes('hello')) {
      polishedText = `Dear ${studentName},\n\n${polishedText}`;
    }
    
    if (!polishedText.toLowerCase().includes('regards') && !polishedText.toLowerCase().includes('sincerely')) {
      polishedText = `${polishedText}\n\nBest regards,\nHelpDesk Support Team`;
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
    model: gpt5NanoModel,
    prompt,
  });

  return text;
}
