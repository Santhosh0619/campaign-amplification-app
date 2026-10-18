import { Linking, Pressable, Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark, Share2, ThumbsDown, ThumbsUp } from 'lucide-react-native';
import { api, errorMessage } from '@/api/client';
import { useBackers, useCampaign, useReports } from '@/api/hooks';
import { AdPreview } from '@/components/campaign/AdPreview';
import { ChoiceRow } from '@/components/campaign/ChoiceRow';
import { CoverArt } from '@/components/campaign/CoverArt';
import { FundingBar } from '@/components/campaign/FundingBar';
import { ReportCard } from '@/components/campaign/ReportCard';
import { CommentThread } from '@/components/campaign/CommentThread';
import { StoryRenderer } from '@/components/campaign/StoryRenderer';
import { TrustBlock } from '@/components/campaign/TrustBlock';
import { UseOfFunds } from '@/components/campaign/UseOfFunds';
import { Accordion, Divider, ErrorState, Screen, ScreenHeader, Skeleton, StatusChip, Text } from '@/components/ui';
import { useAuthGate } from '@/hooks/useAuthGate';
import { number, shortDate, statusLabel } from '@/lib/format';
import { toast } from '@/store/toast';
import { layout, space, useTheme } from '@/theme';
import type { CampaignDetail, CampaignDetailResponse } from '@/types/api';

const partnerMap: Record<string, string> = {
  Facebook: 'Meta (Facebook)',
  Instagram: 'Meta (Instagram)',
  YouTube: 'Google (YouTube)',
  Reddit: 'Reddit Ads',
  LinkedIn: 'LinkedIn Campaign Manager',
  X: 'X Ads',
  TikTok: 'TikTok Ads',
  Pinterest: 'Pinterest Ads',
};

function partnersFor(platforms: string[]) {
  if (platforms.length === 0) return 'Ad networks are chosen by the creator and confirmed in review.';
  return `Ads would run through: ${platforms.map((p) => partnerMap[p] ?? p).join(', ')}. Ads are created paused and activated by a person after approval. (Prototype: no live ad accounts are connected.)`;
}

const isFundingState = (s: string) => ['available_for_funding', 'goal_reached', 'distribution_preparation', 'promoting', 'completed'].includes(s);

export function CampaignDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const gate = useAuthGate();
  const query = useCampaign(String(slug));
  const reports = useReports(String(slug));
  const backers = useBackers(String(slug));

  const refresh = () => qc.invalidateQueries({ queryKey: ['campaigns'] });

  const react = useMutation({
    mutationFn: (value: 'up' | 'down' | null) => api(`/campaigns/${slug}/reaction`, { method: 'POST', body: { value } }),
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const feedback = useMutation({
    mutationFn: (b: { kind: 'visuals' | 'mind_changed' | 'credible'; value: 'no' | 'somewhat' | 'yes' }) => api(`/campaigns/${slug}/feedback`, { method: 'POST', body: b }),
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const save = useMutation({
    mutationFn: () => api<{ saved: boolean }>(`/campaigns/${slug}/save`, { method: 'POST' }),
    onSuccess: (r) => {
      toast.success(r.saved ? 'Saved to your profile.' : 'Removed from saved.');
      void refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (query.isLoading) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader />
        <Skeleton height={220} />
        <Skeleton width="80%" height={32} style={{ marginTop: space.lg }} />
        <Skeleton height={14} style={{ marginTop: space.md }} />
        <Skeleton height={14} width="90%" style={{ marginTop: space.sm }} />
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Screen edges={['top']}>
        <ScreenHeader />
        <ErrorState
          title={(query.error as { status?: number } | null)?.status === 404 ? 'Campaign not found' : 'Could not load this campaign'}
          message={errorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      </Screen>
    );
  }

  const data: CampaignDetailResponse = query.data;
  const c = data.campaign as CampaignDetail;
  const live = isFundingState(c.status);
  const ownerOnly = c.isOwner && !live;

  const share = async () => {
    try {
      await Share.share({ message: `${c.title} — back this message on Campaign: https://campaign.example.com/c/${c.slug}`, title: c.title });
    } catch {
      toast.info('Sharing is not available here.');
    }
  };

  const openSource = (url: string) => {
    Linking.openURL(url).catch(() => toast.error('Could not open that link.'));
  };

  return (
    <Screen
      edges={['top']}
      padded={false}
      footer={live ? <FundingBar campaign={c} onBack={() => router.push({ pathname: '/back/[slug]', params: { slug: c.slug } })} /> : null}
    >
      <ScreenHeader
        right={
          live ? (
            <Pressable onPress={share} hitSlop={10} accessibilityRole="button" accessibilityLabel="Share campaign">
              <Share2 size={22} color={colors.ink} strokeWidth={1.75} />
            </Pressable>
          ) : null
        }
      />
      <CoverArt seed={c.slug} category={c.category} cover={c.cover} ratio={16 / 10} radiusSize={0} label={false} />

      <View style={styles.pad}>
        <View style={styles.kickerRow}>
          <Text variant="kicker" tone="action">
            {c.category}
          </Text>
          {!live ? <StatusChip label={statusLabel(c.status)} tone="warn" /> : null}
        </View>
        <Text variant="display" style={{ fontSize: 31, lineHeight: 35 }}>
          {c.title}
        </Text>
        <Text variant="subheading" tone="muted">
          {c.shortDescription}
        </Text>
        <Text variant="caption" tone="muted">
          by {c.creatorName}
          {c.submittedAt ? ` · Submitted ${shortDate(c.submittedAt)}` : ''}
        </Text>

        {ownerOnly ? (
          <View style={[styles.owner, { borderColor: colors.warn, backgroundColor: colors.warnSoft }]}>
            <Text variant="label">Only you can see this page</Text>
            <Text variant="caption" tone="muted">
              It becomes public after review and approval.
            </Text>
          </View>
        ) : null}

        {live ? (
          <View style={styles.reactRow}>
            <Pressable
              onPress={() => react.mutate(data.viewer.reaction === 'up' ? null : 'up')}
              accessibilityRole="button"
              accessibilityState={{ selected: data.viewer.reaction === 'up' }}
              accessibilityLabel={`Helpful, ${data.reactions.up}`}
              style={[styles.react, { borderColor: data.viewer.reaction === 'up' ? colors.positive : colors.rule }]}
            >
              <ThumbsUp size={18} color={data.viewer.reaction === 'up' ? colors.positive : colors.ink} strokeWidth={1.75} />
              <Text variant="label">{data.reactions.up}</Text>
            </Pressable>
            <Pressable
              onPress={() => react.mutate(data.viewer.reaction === 'down' ? null : 'down')}
              accessibilityRole="button"
              accessibilityState={{ selected: data.viewer.reaction === 'down' }}
              accessibilityLabel={`Not helpful, ${data.reactions.down}`}
              style={[styles.react, { borderColor: data.viewer.reaction === 'down' ? colors.danger : colors.rule }]}
            >
              <ThumbsDown size={18} color={data.viewer.reaction === 'down' ? colors.danger : colors.ink} strokeWidth={1.75} />
              <Text variant="label">{data.reactions.down}</Text>
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable
              onPress={() => gate(() => save.mutate())}
              accessibilityRole="button"
              accessibilityState={{ selected: data.viewer.saved }}
              accessibilityLabel={data.viewer.saved ? 'Remove from saved' : 'Save campaign'}
              style={styles.react}
            >
              <Bookmark size={18} color={colors.ink} strokeWidth={1.75} fill={data.viewer.saved ? colors.ink : 'none'} />
              <Text variant="label">{data.viewer.saved ? 'Saved' : 'Save'}</Text>
            </Pressable>
          </View>
        ) : null}

        {live ? (
          <ChoiceRow
            question="Do the visuals make you interested to read more?"
            value={data.viewer.feedback.visuals}
            onChange={(value) => feedback.mutate({ kind: 'visuals', value })}
          />
        ) : null}
      </View>

      <View style={[styles.pad, { gap: space.lg, marginTop: space.x3 }]}>
        <Divider strong />
        <Text variant="kicker" tone="muted">
          The story
        </Text>
        <StoryRenderer blocks={c.story} />
        {(c.suggestedActions ?? []).filter((a) => a.trim()).length > 0 ? (
          <View style={[styles.actionsBox, { borderColor: colors.ink }]}>
            <Text variant="kicker" tone="action">
              What you can do
            </Text>
            {c.suggestedActions.filter((a) => a.trim()).map((a, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: space.md }}>
                <Text variant="number" tone="action" style={{ width: 22, fontSize: 18 }}>
                  {i + 1}
                </Text>
                <Text variant="body" style={{ flex: 1 }}>
                  {a}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={[styles.pad, { marginTop: space.x3 }]}>
        <Text variant="kicker" tone="muted">
          Sources
        </Text>
        <Text variant="title" style={{ marginBottom: space.sm }}>
          Where the claims come from
        </Text>
        {c.sources.length === 0 ? (
          <Text variant="bodySm" tone="muted">
            The creator has not listed sources yet.
          </Text>
        ) : (
          c.sources.map((s, i) => (
            <Pressable key={s.id} onPress={() => openSource(s.url)} accessibilityRole="link" style={[styles.source, { borderColor: colors.rule }]}>
              <Text variant="number" tone="action" style={{ width: 28 }}>
                {i + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <Text variant="label">{s.title || s.url}</Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {s.url}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>

      <View style={[styles.pad, { marginTop: space.x3 }]}>
        <Accordion title="Why should you back this?">
          <Text variant="body">{c.whyBackersCare || c.whyItMatters || 'The creator has not added a reason yet.'}</Text>
        </Accordion>
        <Accordion title="How is your support spent?">
          <UseOfFunds goalAmount={c.goalAmount} />
        </Accordion>
        <Accordion title="How is this message shown?">
          <AdPreview
            primaryText={c.ad.useOwn ? c.ad.primaryText : c.shortDescription}
            headline={c.ad.useOwn ? c.ad.headline : c.title.slice(0, 40)}
            seed={c.slug}
            category={c.category}
            cover={c.ad.useOwn && c.ad.image?.url ? c.ad.image : c.cover}
            network={c.platforms.join(', ') || 'Facebook'}
          />
          <Text variant="bodySm" tone="muted">
            Audience: {c.targetAudience || 'Chosen by the creator and finalised during review.'}
          </Text>
          {c.reach && (c.reach.locations.length > 0 || c.reach.interests.length > 0) ? (
            <Text variant="bodySm" tone="muted">
              {[c.reach.locations.length ? `Places: ${c.reach.locations.join(', ')}` : null, c.reach.interests.length ? `Interests: ${c.reach.interests.join(', ')}` : null].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
          {c.platforms.length > 1 && c.reach && Object.keys(c.reach.budget).length > 0 ? (
            <Text variant="bodySm" tone="muted">
              Budget split: {c.platforms.map((p) => `${p} ${c.reach.budget[p] ?? 0}%`).join(', ')}
            </Text>
          ) : null}
          <Text variant="bodySm" tone="muted">
            Reach is bought by grouped location, interests and age ranges, never using personal information about individuals. Clicking the ad opens this page.
          </Text>
        </Accordion>
        <Accordion title="How was this reviewed?">
          {c.review.trust ? (
            <>
              <TrustBlock trust={c.review.trust} />
              <ChoiceRow question="Do you find this review credible?" value={data.viewer.feedback.credible} onChange={(value) => feedback.mutate({ kind: 'credible', value })} />
            </>
          ) : (
            <Text variant="bodySm" tone="muted">
              Every campaign is checked against its listed sources before it is published. This one has no published review yet, so no score is shown.
            </Text>
          )}
          <View style={{ gap: 4 }}>
            <Text variant="label">Verification information</Text>
            <Text variant="bodySm" tone="muted">
              {c.sources.length} source{c.sources.length === 1 ? '' : 's'} listed by the creator.{c.review.reviewedAt ? ` Reviewed on ${shortDate(c.review.reviewedAt)}.` : ''} This is a platform review of the evidence provided. It is not independent third-party verification.
            </Text>
          </View>
          <View style={{ gap: 4 }}>
            <Text variant="label">Distribution partners</Text>
            <Text variant="bodySm" tone="muted">
              {partnersFor(c.platforms)}
            </Text>
          </View>
        </Accordion>
        <Accordion title="Who is helping spread this message?" meta={backers.data ? String(backers.data.total) : undefined}>
          {backers.isLoading ? (
            <Skeleton height={16} />
          ) : (backers.data?.total ?? 0) === 0 ? (
            <Text variant="bodySm" tone="muted">
              Named backers and people who chose to stay private will appear here as support grows.
            </Text>
          ) : (
            <>
              {backers.data!.named.length > 0 ? <Text variant="body">{backers.data!.named.join(', ')}</Text> : null}
              <Text variant="bodySm" tone="muted">
                {backers.data!.privateCount > 0 ? `${number(backers.data!.privateCount)} backers chose to stay private.` : ''}
              </Text>
            </>
          )}
        </Accordion>
        <Divider />
      </View>

      {live && (reports.data?.items.length ?? 0) > 0 ? (
        <View style={[styles.pad, { marginTop: space.x3 }]}>
          <Text variant="kicker" tone="muted">
            Progress
          </Text>
          <Text variant="title" style={{ marginBottom: space.sm }}>
            Updates and reports
          </Text>
          {reports.data!.items.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </View>
      ) : null}

      {live ? (
        <View style={[styles.pad, { marginTop: space.x3, gap: space.xl }]}>
          <ChoiceRow
            question="Did this campaign change your mind?"
            value={data.viewer.feedback.mind_changed}
            onChange={(value) => feedback.mutate({ kind: 'mind_changed', value })}
          />

          <CommentThread slug={String(slug)} />

          {c.isDemo ? (
            <Text variant="caption" tone="muted">
              Figures on this page are demonstration data for the prototype. Reach is an estimate based on the app’s configured rate, not a promise.
            </Text>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: layout.gutter, gap: space.md, paddingTop: space.lg },
  kickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  owner: { borderLeftWidth: 3, padding: space.md, gap: 2 },
  reactRow: { flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  react: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: space.md, borderWidth: 1, borderColor: 'transparent', borderRadius: 6 },
  source: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.md, borderTopWidth: 1 },
  comment: { gap: 4, borderTopWidth: 1, paddingTop: space.md },
  actionsBox: { borderTopWidth: 2, paddingTop: space.md, gap: space.md, marginTop: space.md },
});
