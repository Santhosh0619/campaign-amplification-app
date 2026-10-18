import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { CampaignCard } from '@/components/campaign/CampaignCard';
import { Chip, EmptyState, ErrorState, Screen, ScreenHeader, Skeleton, Text } from '@/components/ui';
import { compact, money, number } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { space, useTheme } from '@/theme';
import type { CampaignCard as Card } from '@/types/api';

type Impact = {
  range: string;
  backed: { count: number; contributions: number; totalContributed: number; estimatedReach: number; actions: number; perceptionShiftPct: number | null; campaigns: Card[] };
  created: { count: number; raised: number; estimatedReach: number };
};

const ranges = [
  { key: 'all', label: 'All time' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
  { key: '365', label: 'Last year' },
  { key: 'month', label: 'This month' },
];

export function ImpactScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuth((s) => s.user);
  const [range, setRange] = useState('all');
  const q = useQuery({ queryKey: ['impact', range], queryFn: () => api<Impact>(`/me/impact?range=${range}`), enabled: Boolean(user) });

  if (!user) {
    return (
      <Screen>
        <ScreenHeader title="My impact" />
        <EmptyState title="Sign in to see your impact" message="Back a campaign while signed in and your reach appears here." actionLabel="Sign in" onAction={() => router.push('/auth')} />
      </Screen>
    );
  }

  const d = q.data;
  return (
    <Screen>
      <ScreenHeader title="My impact" />
      <View style={{ gap: space.xl }}>
        <View style={{ gap: space.sm }}>
          <Text variant="display">Your impact</Text>
          <Text variant="body" tone="muted">
            Reach, actions and perception shift across the campaigns you have backed.
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {ranges.map((r) => (
            <Chip key={r.key} label={r.label} selected={range === r.key} onPress={() => setRange(r.key)} />
          ))}
        </ScrollView>

        {q.isLoading ? (
          <Skeleton height={160} />
        ) : q.isError || !d ? (
          <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
        ) : d.backed.contributions === 0 ? (
          <EmptyState title="No impact data yet" message="Back a campaign while signed in to see your contribution, reach and perception shift here." actionLabel="Browse campaigns" onAction={() => router.push('/explore')} />
        ) : (
          <>
            <View style={[styles.grid, { borderColor: colors.ink }]}>
              <Cell label="Contributed" value={money(d.backed.totalContributed)} />
              <Cell label="Campaigns backed" value={String(d.backed.count)} />
              <Cell label="People reached (est.)" value={compact(d.backed.estimatedReach)} />
              <Cell label="Actions taken" value={d.backed.actions ? number(d.backed.actions) : '—'} />
              <Cell label="Changed their mind" value={d.backed.perceptionShiftPct != null ? `${d.backed.perceptionShiftPct}%` : '—'} />
            </View>
            <Text variant="caption" tone="muted">
              Reach is an estimate from your contributions. Actions and perception shift appear once a campaign finishes and its final report is published.
            </Text>
            <View style={{ gap: space.md }}>
              <Text variant="title">Campaigns you backed</Text>
              {d.backed.campaigns.map((c) => (
                <CampaignCard key={c.id} campaign={c} compact />
              ))}
            </View>
          </>
        )}

        {d && d.created.count > 0 ? (
          <View style={{ gap: space.sm }}>
            <Text variant="title">Your campaigns</Text>
            <View style={[styles.grid, { borderColor: colors.rule }]}>
              <Cell label="Created" value={String(d.created.count)} />
              <Cell label="Raised" value={money(d.created.raised)} />
              <Cell label="Reach funded (est.)" value={compact(d.created.estimatedReach)} />
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '50%', paddingVertical: space.md, gap: 2 }}>
      <Text variant="number">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({ grid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 2 } });
