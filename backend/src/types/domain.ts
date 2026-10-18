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

/** Statuses visible to the public (feed, explore, detail). */
export const PUBLIC_STATUSES: CampaignStatus[] = [
  'available_for_funding',
  'goal_reached',
  'distribution_preparation',
  'promoting',
  'completed',
];

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

export type AdCreative = {
  useOwn: boolean;
  headline: string;
  primaryText: string;
  image?: Cover;
};

export type TrustReview = {
  demo: true;
  score: number;
  label: string;
  factCheck: { score: number; note: string };
  communication: { score: number | null; note: string };
  sharedReality: { score: number; note: string };
};

export type ReviewInfo = {
  reviewedAt?: string;
  notes?: string;
  changeRequest?: string;
  rejectionReason?: string;
  trust?: TrustReview;
};

export type Campaign = {
  id: string;
  slug: string;
  creatorId: string;
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
  storySummary: { about: string; whoFor: string; whyMatters: string; sameForBackers: boolean };
  raisedAmount: number;
  backersCount: number;
  featured: boolean;
  isDemo: boolean;
  review: ReviewInfo;
  submittedAt?: string;
  publishedAt?: string;
  fundingEndsAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  slug: string;
  joinedAt: string;
  notificationPrefs: Record<NotificationCategory, boolean>;
  publicProfile: {
    visibility: 'public' | 'unlisted' | 'private';
    displayName: string;
    bio: string;
    location: string;
    show: Record<'totalReach' | 'moneyRaised' | 'amplified' | 'contributed' | 'avgTrust', boolean>;
    hideCreated: boolean;
    hideBacked: boolean;
  };
};

export type ContributionStatus = 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'rejected' | 'refund_pending' | 'refunded';

export type Contribution = {
  id: string;
  campaignId: string;
  userId: string | null;
  guestEmail?: string;
  amount: number;
  fee: number;
  total: number;
  estimatedReach: number;
  status: ContributionStatus;
  showFirstName: boolean;
  displayName?: string;
  receiptNo: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationCategory = 'campaigns' | 'funding' | 'backing' | 'reports' | 'account';

export type Notification = {
  id: string;
  userId: string;
  category: NotificationCategory;
  type: string;
  title: string;
  body: string;
  campaignId?: string;
  readAt?: string | null;
  createdAt: string;
};

export type Report = {
  id: string;
  campaignId: string;
  kind: 'update' | 'milestone' | 'progress' | 'final';
  title: string;
  body: string;
  metrics?: {
    fundsRaised: number;
    adSpend: number;
    impressions: number;
    reach: number;
    reachKind: 'estimated' | 'measured';
    clicks: number;
    perceptionShiftPct?: number;
  };
  createdAt: string;
};

export type Comment = {
  id: string;
  campaignId: string;
  userId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type Feedback = {
  id: string;
  campaignId: string;
  userKey: string;
  kind: 'visuals' | 'mind_changed' | 'credible';
  value: 'no' | 'somewhat' | 'yes';
};

export type Reaction = { id: string; campaignId: string; userKey: string; value: 'up' | 'down' };

export type Saved = { id: string; campaignId: string; userId: string; createdAt: string };
