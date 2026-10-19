import { env } from '../config/env.js';
import { categories } from '../config/rules.js';
import { AppError } from '../lib/errors.js';
import { newId } from '../lib/ids.js';
import type { StoryBlock } from '../types/domain.js';
import type { AiDraft, VoiceAnswers, VoiceDraft } from './ai.js';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

export const aiNotLinked = () => new AppError(503, 'ai_not_configured', 'AI drafting is not linked yet. The API key is missing or not valid.');
export const aiLimitReached = () => new AppError(429, 'ai_limit_reached', 'The free AI limit has been reached for now. Please try again later or write the campaign yourself.');
const aiUnavailable = () => new AppError(502, 'ai_unavailable', 'The AI service could not be reached. Please try again in a moment.');

/** Calls Gemini and returns the parsed JSON object it produced. */
async function generateJson(prompt: string): Promise<Record<string, unknown>> {
  if (!env.geminiApiKey) throw aiNotLinked();
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${env.geminiModel}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.geminiApiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.6 },
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (e) {
    console.error('gemini request failed', e instanceof Error ? e.message : e);
    throw aiUnavailable();
  }
  if (res.status === 429) throw aiLimitReached();
  if (res.status === 401 || res.status === 403) throw aiNotLinked();
  if (res.status === 400) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    if (/api key/i.test(body.error?.message ?? '')) throw aiNotLinked();
    throw aiUnavailable();
  }
  if (!res.ok) {
    console.error('gemini status', res.status);
    throw aiUnavailable();
  }
  const data = (await res.json().catch(() => null)) as { candidates?: { content?: { parts?: { text?: string }[] } }[] } | null;
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  try {
    const parsed: unknown = JSON.parse(text.replace(/^```json\s*|```$/g, '').trim());
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch {
    // fall through
  }
  throw new AppError(502, 'ai_unavailable', 'The AI returned something we could not read. Please try again.');
}

const str = (v: unknown, max: number, fallback = '') => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback);

const SHAPE = `Return a JSON object with exactly these keys:
{
  "title": string (max 60 chars, plain and specific, no clickbait),
  "category": one of ${categories.join(', ')},
  "shortDescription": string (max 150 chars),
  "paragraphs": string[] (3 to 5 short paragraphs of the campaign story, plain text, **bold** allowed sparingly),
  "whyBackersCare": string (max 200 chars, why a stranger would chip in to spread this message),
  "targetAudience": string (max 300 chars),
  "whyItMatters": string (max 400 chars),
  "about": string (max 300 chars, one-sentence summary),
  "whoFor": string (max 300 chars),
  "whyMatters": string (max 300 chars)
}
Rules: write in the creator's voice, use only facts the creator gave, never invent statistics, names or links, never set a funding goal, and do not make claims of guaranteed results. This is a message-amplification campaign, not a donation appeal.`;

function toDraft(o: Record<string, unknown>): AiDraft {
  const paragraphs = Array.isArray(o.paragraphs) ? o.paragraphs.map((p) => str(p, 1200)).filter(Boolean).slice(0, 6) : [];
  const category = str(o.category, 40);
  const title = str(o.title, 60);
  if (!title || paragraphs.length === 0) throw new AppError(502, 'ai_unavailable', 'The AI returned an incomplete draft. Please try again.');
  const story: StoryBlock[] = paragraphs.map((text) => ({ id: newId('blk'), type: 'paragraph' as const, text }));
  const about = str(o.about, 300, paragraphs[0].slice(0, 300));
  return {
    title,
    category: (categories as readonly string[]).includes(category) ? category : 'Other',
    shortDescription: str(o.shortDescription, 150, about.slice(0, 150)),
    story,
    whyBackersCare: str(o.whyBackersCare, 200, 'Your contribution pays to put this message in front of people who would not otherwise see it.'),
    targetAudience: str(o.targetAudience, 300, 'People who are not yet following this issue.'),
    whyItMatters: str(o.whyItMatters, 400, about),
    storySummary: {
      about,
      whoFor: str(o.whoFor, 300, str(o.targetAudience, 300, 'People who are not yet following this issue.')),
      whyMatters: str(o.whyMatters, 300, about),
      sameForBackers: true,
    },
  };
}

export async function aiDraftFromPrompt(prompt: string): Promise<AiDraft> {
  const raw = await generateJson(`You help a creator turn a rough idea into a clear campaign draft.\n\nCreator's description:\n"""${prompt}"""\n\n${SHAPE}`);
  return toDraft(raw);
}

export async function aiDraftFromAnswers(a: VoiceAnswers): Promise<VoiceDraft> {
  const raw = await generateJson(
    `A creator answered four interview questions out loud. Turn the answers into a campaign draft.\n\n1. What is your message about?\n"""${a.about}"""\n2. Who should hear it?\n"""${a.audience || '(skipped)'}"""\n3. Why does it matter?\n"""${a.why || '(skipped)'}"""\n4. What evidence supports it?\n"""${a.evidence || '(skipped)'}"""\n\nThe speech may contain transcription slips; quietly fix obvious ones.\n${SHAPE}`,
  );
  const draft = toDraft(raw);
  const urls = [...new Set((a.evidence.match(/https?:\/\/[^\s,)]+/g) ?? []).map((u) => u.replace(/[.;]+$/, '')))];
  return { ...draft, sources: urls.slice(0, 5).map((url) => ({ id: newId('src'), title: url.replace(/^https?:\/\//, '').slice(0, 60), url })) };
}
