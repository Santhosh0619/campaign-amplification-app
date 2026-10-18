import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMyCampaigns } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import { CoverArt } from '@/components/campaign/CoverArt';
import { Button, Chip, EmptyState, ErrorState, ProgressBar, Screen, ScreenHeader, Skeleton, StatusChip, Text, type StatusTone } from '@/components/ui';
import { daysLeftLabel, money, number, statusLabel } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { radius, space, useTheme } from '@/theme';
import type { CampaignStatus, OwnerCampaign } from '@/types/api';

export const statusTone = (s: CampaignStatus): StatusTone =>
  s === 'completed' || s === 'promoting' ? 'positive' : s === 'available_for_funding' || s === 'goal_reached' ? 'action' : s === 'changes_requested' || s === 'submitted' || s === 'distribution_preparation' ? 'warn' : s === 'rejected' || s === 'failed' || s === 'cancelled' ? 'danger' : 'neutral';

type TabKey = 'all' | 'drafts' | 'review' | 'funding' | 'promoting' | 'completed' | 'action';

const tabs: { key: TabKey; label: string; match: (s: CampaignStatus) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'drafts', label: 'Drafts', match: (s) => s === 'draft' },
  { key: 'review', label: 'Under review', match: (s) => s === 'submitted' },
  { key: 'funding', label: 'Published / Funding', match: (s) => s === 'approved' || s === 'available_for_funding' || s === 'goal_reached' },
  { key: 'promoting', label: 'Promoting', match: (s) => s === 'distribution_preparation' || s === 'promoting' },
  { key: 'completed', label: 'Completed', match: (s) => s === 'completed' },
  { key: 'action', label: 'Requires action', match: (s) => s === 'changes_requested' },
];

export function MyCampaignsScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const q = useMyCampaigns(Boolean(user));
  const [tab, setTab] = useState<TabKey>('all');
  const items = q.data?.items ?? [];

  const counts = useMemo(() => Object.fromEntries(tabs.map((t) => [t.key, items.filter((c) => t.match(c.status)).length])) as Record<TabKey, number>, [items]);
  const shown = items.filter((c) => tabs.find((t) => t.key === tab)!.match(c.status));

  if (!user) {
    return (
      <Screen>
        <ScreenHeader title="My campaigns" />
        <EmptyState title="Sign in to see your campaigns" message="Your drafts and campaigns are tied to your account." actionLabel="Sign in" onAction={() => router.push('/auth')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="My campaigns" />
      <View style={{ gap: space.lg }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {tabs.map((t) => (
            <Chip key={t.key} label={`${t.label}${counts[t.key] ? ` · ${counts[t.key]}` : ''}`} selected={tab === t.key} onPress={() => setTab(t.key)} />
          ))}
        </ScrollView>

        {q.isLoading ? (
          <>
            <Skeleton height={110} />
            <Skeleton height={110} />
          </>
        ) : q.isError ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : shown.length === 0 ? (
          <EmptyState
            title={tab === 'all' ? 'No campaigns yet' : 'Nothing here'}
            message={tab === 'all' ? 'When you create a campaign it shows up here, and you can track its status and open its live page.' : 'No campaigns match this filter.'}
            actionLabel={tab === 'all' ? 'Create your first campaign' : 'Show all'}
            onAction={() => (tab === 'all' ? router.push('/create') : setTab('all'))}
          />
        ) : (
          shown.map((c) => <CampaignRow key={c.id} c={c} />)
        )}

        {items.length > 0 ? <Button label="Start a new campaign" variant="secondary" onPress={() => router.push('/create')} /> : null}
      </View>
    </Screen>
  );
}

function CampaignRow({ c }: { c: OwnerCampaign }) {
  const router = useRouter();
  const { colors } = useTheme();
  const editable = c.status === 'draft' || c.status === 'changes_requested';
  const live = ['available_for_funding', 'goal_reached', 'distribution_preparation', 'promoting', 'completed'].includes(c.status);
  const open = () => router.push({ pathname: '/my-campaigns/[id]', params: { id: c.id } });

  return (
    <View style={[styles.card, { borderColor: colors.rule, backgroundColor: colors.surface }]}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`${c.title || 'Untitled draft'}, ${statusLabel(c.status)}`} style={styles.top}>
        <View style={{ width: 84 }}>
          <CoverArt seed={c.slug || c.id} category={c.category || 'Other'} cover={c.cover} ratio={1} label={false} radiusSize={radius.sm} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <StatusChip label={statusLabel(c.status)} tone={statusTone(c.status)} />
          <Text variant="heading" numberOfLines={2} style={{ fontSize: 18, lineHeight: 22 }}>
            {c.title || 'Untitled draft'}
          </Text>
        </View>
      </Pressable>

      {live || c.goalAmount > 0 ? (
        <View style={{ gap: 6 }}>
          {live ? <ProgressBar value={c.percentFunded / 100} /> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="caption" tone="muted">
              {live ? `${money(c.raisedAmount)} of ${money(c.goalAmount)}` : `Goal ${money(c.goalAmount)}`}
            </Text>
            <Text variant="caption" tone="muted">
              {c.status === 'available_for_funding' ? daysLeftLabel(c.daysLeft, c.status) : `≈ ${number(c.estimatedReachAtGoal)} reach at goal`}
            </Text>
          </View>
        </View>
      ) : null}

      {c.status === 'changes_requested' && c.draft.review.changeRequest ? (
        <Text variant="bodySm" tone="muted">
          Reviewer: {c.draft.review.changeRequest}
        </Text>
      ) : null}
      {c.status === 'submitted' ? (
        <Text variant="bodySm" tone="muted">
          In the review queue. This usually takes about a day.
        </Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {editable ? <Button label="Continue editing" size="sm" onPress={() => router.push({ pathname: '/create/[id]', params: { id: c.id } })} fullWidth={false} /> : null}
        <Button label={live ? 'Manage' : 'Details'} variant="secondary" size="sm" onPress={open} fullWidth={false} />
        {live ? <Button label="View page" variant="ghost" size="sm" onPress={() => router.push({ pathname: '/campaign/[slug]', params: { slug: c.slug } })} fullWidth={false} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.md, padding: space.lg, gap: space.md },
  top: { flexDirection: 'row', gap: space.lg },
});
