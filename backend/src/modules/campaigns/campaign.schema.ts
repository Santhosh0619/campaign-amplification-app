import { z } from 'zod';
import { adPlatforms, categories, rules } from '../../config/rules.js';

const imageUrl = z
  .string()
  .max(500)
  .refine((v) => /^https?:\/\//.test(v) || v.startsWith('/api/'), 'Image link is not valid.');

const coverSchema = z.object({
  url: imageUrl.optional(),
  alt: z.string().max(200).optional(),
  generated: z.boolean().optional(),
  rightsConfirmed: z.boolean().optional(),
});

const blockSchema = z.object({
  id: z.string().min(1).max(40),
  type: z.enum(['heading', 'paragraph', 'image', 'stat', 'quote', 'list']),
  text: z.string().max(4000).optional(),
  items: z.array(z.string().max(500)).max(20).optional(),
  imageUrl: imageUrl.optional(),
  caption: z.string().max(300).optional(),
  credit: z.string().max(200).optional(),
  value: z.string().max(40).optional(),
  label: z.string().max(200).optional(),
});

const sourceSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().max(200),
  url: z.string().max(500),
});

/** Autosave schema: lenient on content (work in progress) but strict on shape and size. */
export const draftSchema = z
  .object({
    title: z.string().max(60),
    category: z.string().max(40),
    creatorName: z.string().max(80),
    shortDescription: z.string().max(150),
    story: z.array(blockSchema).max(80),
    whyBackersCare: z.string().max(2000),
    sources: z.array(sourceSchema).max(20),
    cover: coverSchema,
    ad: z.object({
      useOwn: z.boolean(),
      headline: z.string().max(40),
      primaryText: z.string().max(125),
      image: coverSchema.optional(),
      videoUrl: z.string().max(300).optional(),
    }),
    goalAmount: z.number().min(0).max(1_000_000).nullable(),
    fundingWindow: z.union([z.literal(14), z.literal(30), z.literal(45), z.literal(60), z.literal('evergreen')]),
    targetAudience: z.string().max(600),
    whyItMatters: z.string().max(600),
    platforms: z.array(z.enum(adPlatforms)).max(8),
    reach: z.object({
      locations: z.array(z.string().trim().min(1).max(60)).max(12),
      interests: z.array(z.string().trim().min(1).max(40)).max(12),
      budget: z.record(z.string(), z.number().int().min(0).max(100)),
    }),
    suggestedActions: z.array(z.string().max(200)).max(5),
    storySummary: z.object({
      about: z.string().max(600),
      whoFor: z.string().max(600),
      whyMatters: z.string().max(600),
      sameForBackers: z.boolean(),
    }),
  })
  .partial();

export type DraftInput = z.infer<typeof draftSchema>;

export const submitSchema = z.object({
  termsAccepted: z.literal(true, { message: 'Confirm the campaign terms to submit.' }),
});

const hasBodyText = (blocks: { type: string; text?: string; items?: string[] }[]) =>
  blocks.some((b) => (b.type === 'paragraph' || b.type === 'quote') && (b.text ?? '').trim().length >= 20);

/** Strict rules that must pass before a campaign can be submitted for review. */
export function submitProblems(c: {
  title: string;
  category: string;
  creatorName: string;
  shortDescription: string;
  story: { type: string; text?: string; items?: string[] }[];
  cover: { url?: string; generated?: boolean; rightsConfirmed?: boolean };
  ad: { useOwn: boolean; headline: string; primaryText: string; image?: { url?: string; rightsConfirmed?: boolean } };
  goalAmount: number;
  platforms: string[];
  targetAudience: string;
  reach: { budget: Record<string, number> };
}): Record<string, string> {
  const p: Record<string, string> = {};
  if (!c.title.trim()) p.title = 'Add a campaign title.';
  if (!(categories as readonly string[]).includes(c.category)) p.category = 'Choose a category.';
  if (!c.creatorName.trim()) p.creatorName = 'Tell people who is behind this campaign.';
  if (!c.shortDescription.trim()) p.shortDescription = 'Write a short description.';
  if (!hasBodyText(c.story)) p.story = 'Write the story of your campaign (at least a couple of sentences).';
  if (!c.cover.url && !c.cover.generated) p.cover = 'Add a cover image.';
  if (c.cover.url && !c.cover.generated && !c.cover.rightsConfirmed) p.coverRights = 'Confirm you have the right to use this image.';
  if (c.ad.useOwn) {
    if (!c.ad.headline.trim()) p.adHeadline = 'Add an ad headline.';
    if (!c.ad.primaryText.trim()) p.adPrimaryText = 'Add the ad text.';
    if (c.ad.image?.url && !c.ad.image.rightsConfirmed) p.adImageRights = 'Confirm you have the right to use the ad image.';
  }
  if (c.platforms.length === 0) p.platforms = 'Choose at least one ad platform.';
  if (!c.targetAudience.trim()) p.targetAudience = 'Describe who this should reach.';
  if (c.platforms.length > 1) {
    const total = c.platforms.reduce((sum, name) => sum + (c.reach.budget[name] ?? 0), 0);
    if (total !== 100) p.budget = 'Budget shares across your platforms must add up to 100%.';
  }
  if (!c.goalAmount || c.goalAmount < rules.minGoal) p.goalAmount = `Set a funding goal of at least $${rules.minGoal}.`;
  return p;
}
