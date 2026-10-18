import { categories } from '../config/rules.js';
import { newId } from '../lib/ids.js';
import type { StoryBlock } from '../types/domain.js';

/**
 * Demo AI provider. It builds a draft from the creator's own words with simple rules,
 * so the flow works with no external service. Everything it returns is editable.
 */
const keywordMap: [string, string][] = [
  ['school', 'Education'],
  ['student', 'Education'],
  ['water', 'Health'],
  ['health', 'Health'],
  ['hospital', 'Health'],
  ['tree', 'Environment'],
  ['climate', 'Environment'],
  ['river', 'Environment'],
  ['bus', 'Civic'],
  ['vote', 'Civic'],
  ['ballot', 'Civic'],
  ['council', 'Civic'],
  ['shelter', 'Community'],
  ['neighbour', 'Community'],
  ['neighbor', 'Community'],
  ['repair', 'Consumer'],
  ['farm', 'Consumer'],
  ['music', 'Music'],
  ['art', 'Art'],
  ['science', 'Science'],
  ['research', 'Science'],
  ['startup', 'Local Business'],
  ['shop', 'Local Business'],
  ['app', 'Technology'],
];

export type AiDraft = {
  title: string;
  category: string;
  shortDescription: string;
  story: StoryBlock[];
  whyBackersCare: string;
  targetAudience: string;
  whyItMatters: string;
  storySummary: { about: string; whoFor: string; whyMatters: string; sameForBackers: boolean };
};

const sentences = (text: string) =>
  text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

const clip = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

export function draftFromPrompt(prompt: string): AiDraft {
  const text = prompt.trim();
  const lower = text.toLowerCase();
  const category = keywordMap.find(([k]) => lower.includes(k))?.[1] ?? 'Other';
  const parts = sentences(text);
  const first = parts[0] ?? text;
  const rest = parts.slice(1);

  const title = clip(first.replace(/[.!?]+$/, ''), 60);
  const short = clip(parts.slice(0, 2).join(' '), 150);
  const paragraphs = rest.length ? [rest.slice(0, 3).join(' '), rest.slice(3).join(' ')].filter(Boolean) : [first];

  const story: StoryBlock[] = [
    { id: newId('blk'), type: 'paragraph', text: first },
    ...paragraphs.map((p) => ({ id: newId('blk'), type: 'paragraph' as const, text: p })),
  ];

  return {
    title,
    category: (categories as readonly string[]).includes(category) ? category : 'Other',
    shortDescription: short,
    story,
    whyBackersCare: 'Your contribution pays to put this message in front of people who would not otherwise see it.',
    targetAudience: 'People in the affected community and nearby areas who are not yet following this issue.',
    whyItMatters: clip(rest[0] ?? first, 300),
    storySummary: {
      about: clip(first, 300),
      whoFor: 'People in the affected community and nearby areas.',
      whyMatters: clip(rest[0] ?? first, 300),
      sameForBackers: true,
    },
  };
}

export type VoiceAnswers = { about: string; audience: string; why: string; evidence: string };

export type VoiceDraft = AiDraft & { sources: { id: string; title: string; url: string }[] };

/** Builds a draft from the four guided interview answers. URLs mentioned as evidence become listed sources. */
export function draftFromAnswers(a: VoiceAnswers): VoiceDraft {
  const about = a.about.trim();
  const base = draftFromPrompt([about, a.why.trim()].filter(Boolean).join(' '));
  const urls = [...new Set((a.evidence.match(/https?:\/\/[^\s,)]+/g) ?? []).map((u) => u.replace(/[.;]+$/, '')))];
  const evidenceText = a.evidence.replace(/https?:\/\/[^\s,)]+/g, '').replace(/\s+/g, ' ').trim();

  const story: StoryBlock[] = [...base.story];
  if (a.audience.trim()) story.push({ id: newId('blk'), type: 'paragraph', text: `**Who this is for.** ${a.audience.trim()}` });
  if (evidenceText) story.push({ id: newId('blk'), type: 'paragraph', text: `**What the evidence says.** ${evidenceText}` });

  return {
    ...base,
    story,
    targetAudience: clip(a.audience.trim() || base.targetAudience, 600),
    whyItMatters: clip(a.why.trim() || base.whyItMatters, 600),
    storySummary: {
      about: clip(about || base.storySummary.about, 600),
      whoFor: clip(a.audience.trim() || base.storySummary.whoFor, 600),
      whyMatters: clip(a.why.trim() || base.storySummary.whyMatters, 600),
      sameForBackers: true,
    },
    sources: urls.slice(0, 5).map((url) => ({ id: newId('src'), title: url.replace(/^https?:\/\//, '').slice(0, 60), url })),
  };
}
