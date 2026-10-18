import type { AdCreative, CampaignDraft, Cover, ReachTargeting, Source, StoryBlock } from '@/types/api';

/** The part of a campaign the creator edits. Mirrors the backend draft schema. */
export type DraftForm = {
  title: string;
  category: string;
  creatorName: string;
  shortDescription: string;
  story: StoryBlock[];
  whyBackersCare: string;
  sources: Source[];
  cover: Cover;
  ad: AdCreative;
  goalAmount: number | null;
  fundingWindow: number | 'evergreen';
  targetAudience: string;
  whyItMatters: string;
  platforms: string[];
  reach: ReachTargeting;
  suggestedActions: string[];
  storySummary: { about: string; whoFor: string; whyMatters: string; sameForBackers: boolean };
};

export const STEP_LABELS = ['Basics', 'Story', 'Visuals', 'Reach', 'Submit'] as const;
export type StepIndex = 0 | 1 | 2 | 3 | 4;

export function formFromDraft(d: CampaignDraft): DraftForm {
  return {
    title: d.title,
    category: d.category,
    creatorName: d.creatorName,
    shortDescription: d.shortDescription,
    story: d.story,
    whyBackersCare: d.whyBackersCare,
    sources: d.sources,
    cover: d.cover,
    ad: d.ad,
    goalAmount: d.goalAmount > 0 ? d.goalAmount : null,
    fundingWindow: d.fundingWindow,
    targetAudience: d.targetAudience,
    whyItMatters: d.whyItMatters,
    platforms: d.platforms,
    reach: d.reach ?? { locations: [], interests: [], budget: evenSplit(d.platforms) },
    suggestedActions: d.suggestedActions ?? [],
    storySummary: d.storySummary,
  };
}

/** Splits 100% across platforms as evenly as whole numbers allow (the first platforms take the remainder). */
export function evenSplit(platforms: string[]): Record<string, number> {
  if (platforms.length === 0) return {};
  const base = Math.floor(100 / platforms.length);
  let extra = 100 - base * platforms.length;
  return Object.fromEntries(platforms.map((p) => [p, base + (extra-- > 0 ? 1 : 0)]));
}

export const budgetTotal = (f: Pick<DraftForm, 'platforms' | 'reach'>) => f.platforms.reduce((s, p) => s + (f.reach.budget[p] ?? 0), 0);

export const newBlockId = () => `blk_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const wordCount = (blocks: StoryBlock[]) =>
  blocks
    .flatMap((b) => [b.text ?? '', ...(b.items ?? [])])
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;

export type Problems = Record<string, string>;

const urlOk = (u: string) => /^https?:\/\/\S+\.\S+/.test(u.trim());

/** Per-step validation. Keys line up with the server's submit rules so both sides agree. */
export function validateStep(step: StepIndex, f: DraftForm, minGoal: number, termsAccepted = false): Problems {
  const p: Problems = {};
  if (step === 0) {
    if (!f.title.trim()) p.title = 'Add a campaign title.';
    if (!f.category) p.category = 'Choose a category.';
    if (!f.creatorName.trim()) p.creatorName = 'Tell people who is behind this campaign.';
  }
  if (step === 1) {
    if (!f.shortDescription.trim()) p.shortDescription = 'Write a short description.';
    const hasBody = f.story.some((b) => (b.type === 'paragraph' || b.type === 'quote') && (b.text ?? '').trim().length >= 20);
    if (!hasBody) p.story = 'Write the story of your campaign (at least a couple of sentences).';
    f.sources.forEach((s, i) => {
      if (s.url.trim() && !urlOk(s.url)) p[`source_${i}`] = 'Enter a full link starting with http:// or https://';
    });
  }
  if (step === 2) {
    if (!f.cover.url && !f.cover.generated) p.cover = 'Add a cover image.';
    if (f.cover.url && !f.cover.generated && !f.cover.rightsConfirmed) p.coverRights = 'Confirm you have the right to use this image.';
    if (f.ad.useOwn) {
      if (!f.ad.headline.trim()) p.adHeadline = 'Add an ad headline.';
      if (!f.ad.primaryText.trim()) p.adPrimaryText = 'Add the ad text.';
      if (f.ad.image?.url && !f.ad.image.rightsConfirmed) p.adImageRights = 'Confirm you have the right to use the ad image.';
    }
  }
  if (step === 3) {
    if (f.platforms.length === 0) p.platforms = 'Choose at least one ad platform.';
    if (!f.targetAudience.trim()) p.targetAudience = 'Describe who this should reach.';
    if (f.platforms.length > 1 && budgetTotal(f) !== 100) p.budget = 'Budget shares must add up to 100%.';
  }
  if (step === 4) {
    if (!f.goalAmount || f.goalAmount < minGoal) p.goalAmount = `Set a funding goal of at least $${minGoal}.`;
    if (!termsAccepted) p.terms = 'Confirm the campaign terms to submit.';
  }
  return p;
}

export const stepOfProblem = (key: string): StepIndex => {
  if (['title', 'category', 'creatorName'].includes(key)) return 0;
  if (['shortDescription', 'story'].includes(key) || key.startsWith('source_')) return 1;
  if (['cover', 'coverRights', 'adHeadline', 'adPrimaryText', 'adImageRights'].includes(key)) return 2;
  if (['platforms', 'targetAudience', 'budget'].includes(key)) return 3;
  return 4;
};

/** A step counts as complete when it has no blocking problems. */
export const stepComplete = (step: StepIndex, f: DraftForm, minGoal: number) => Object.keys(validateStep(step, f, minGoal, true)).length === 0;
