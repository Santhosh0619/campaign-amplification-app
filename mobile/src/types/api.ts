// Shapes returned by the backend. Kept in one file so screens never guess field names.

export type CampaignStatus =
  | 'draft'
  | 'submitted'
  | 'changes_requested'
  | 'approved'
  | 'available_for_funding'
  | 'goal_reached'
  | 'distribution_preparation'
  | 'promoting'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'refund_pending'
  | 'failed';

export type StoryBlock = {
  id: string;
  type: 'heading' | 'paragraph' | 'image' | 'stat' | 'quote' | 'list';
  text?: string;
  items?: string[];
  imageUrl?: string;
  caption?: string;
  credit?: string;
  value?: string;
  label?: string;
};

export type Source = { id: string; title: string; url: string };
export type Cover = { url?: string; alt?: string; generated?: boolean; rightsConfirmed?: boolean };

export type CampaignCard = {
  id: string;
  slug: string;
  title: string;
  category: string;
  creatorName: string;
  shortDescription: string;
  cover: Cover;
  status: CampaignStatus;
  raisedAmount: number;
  goalAmount: number;
  percentFunded: number;
  daysLeft: number | null;
  estimatedReachAtGoal: number;
  backersCount: number;
  featured: boolean;
  isDemo: boolean;
  submittedAt: string | null;
};

export type TrustReview = {
  demo: true;
  score: number;
  label: string;
  factCheck: { score: number; note: string };
  communication: { score: number | null; note: string };
  sharedReality: { score: number; note: string };
};

export type AdCreative = { useOwn: boolean; headline: string; primaryText: string; image?: Cover; videoUrl?: string };
export type ReachTargeting = { locations: string[]; interests: string[]; budget: Record<string, number> };

export type CampaignDetail = CampaignCard & {
  story: StoryBlock[];
  whyBackersCare: string;
  sources: Source[];
  ad: AdCreative;
  targetAudience: string;
  whyItMatters: string;
  platforms: string[];
  reach: ReachTargeting;
  suggestedActions: string[];
  storySummary: { about: string; whoFor: string; whyMatters: string; sameForBackers: boolean };
  review: { reviewedAt: string | null; trust: TrustReview | null };
  publishedAt: string | null;
  fundingEndsAt: string | null;
  fundingWindow: number | 'evergreen';
  isOwner: boolean;
  activation: { thresholdRate: number; thresholdAmount: number; reached: boolean };
  canBack: boolean;
};

/** The editable form of a campaign (mirrors the backend Campaign without creatorId). */
export type CampaignDraft = {
  id: string;
  slug: string;
  status: CampaignStatus;
  title: string;
  category: string;
  creatorName: string;
  shortDescription: string;
  story: StoryBlock[];
  whyBackersCare: string;
  sources: Source[];
  cover: Cover;
  ad: AdCreative;
  goalAmount: number;
  fundingWindow: number | 'evergreen';
  targetAudience: string;
  whyItMatters: string;
  platforms: string[];
  reach?: ReachTargeting;
  suggestedActions?: string[];
  storySummary: { about: string; whoFor: string; whyMatters: string; sameForBackers: boolean };
  raisedAmount: number;
  backersCount: number;
  review: { reviewedAt?: string; notes?: string; changeRequest?: string; rejectionReason?: string };
  updatedAt: string;
  submittedAt?: string;
};

export type OwnerCampaign = CampaignDetail & { draft: CampaignDraft };

export type ViewerState = { saved: boolean; reaction: 'up' | 'down' | null; feedback: Record<string, 'no' | 'somewhat' | 'yes'> };

export type CampaignDetailResponse = {
  campaign: CampaignDetail | OwnerCampaign;
  viewer: ViewerState;
  reactions: { up: number; down: number };
};

export type Paged<T> = { items: T[]; total: number; page: number; hasMore: boolean };

export type AppUser = {
  id: string;
  email: string;
  name: string;
  slug: string;
  joinedAt: string;
  notificationPrefs: Record<'campaigns' | 'funding' | 'backing' | 'reports' | 'account', boolean>;
};

export type Quote = { amount: number; fee: number; total: number; estimatedReach: number; adShare: number; platformShare: number };

export type Contribution = {
  id: string;
  campaignId: string;
  amount: number;
  fee: number;
  total: number;
  estimatedReach: number;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'rejected' | 'refund_pending' | 'refunded';
  showFirstName: boolean;
  receiptNo: string;
  failureReason?: string;
  createdAt: string;
};

export type NotificationItem = {
  id: string;
  category: 'campaigns' | 'funding' | 'backing' | 'reports' | 'account';
  type: string;
  title: string;
  body: string;
  campaignId?: string;
  readAt?: string | null;
  createdAt: string;
};

export type ReportMetrics = {
  fundsRaised: number;
  adSpend: number;
  impressions: number;
  reach: number;
  reachKind: 'estimated' | 'measured';
  clicks: number;
  perceptionShiftPct?: number;
};

export type Report = {
  id: string;
  campaignId: string;
  kind: 'update' | 'milestone' | 'progress' | 'final';
  title: string;
  body: string;
  metrics?: ReportMetrics;
  createdAt: string;
};

export type AppConfig = {
  categories: string[];
  adPlatforms: string[];
  reachPerDollar: number;
  platformFeeRate: number;
  processingRate: number;
  processingFixed: number;
  activationThresholdRate: number;
  minGoal: number;
  presets: number[];
  fundingWindows: (number | 'evergreen')[];
  reviewHours: number;
  demoMode: boolean;
};
