import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, errorMessage } from '@/api/client';
import { qk, useMyCampaigns, useNotifications } from '@/api/hooks';
import { Button, Chip, EmptyState, ErrorState, Skeleton, Text } from '@/components/ui';
import { timeAgo } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { fonts, layout, space, useTheme } from '@/theme';
import type { NotificationItem } from '@/types/api';

type Filter = 'all' | NotificationItem['category'];

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'campaigns', label: 'Review' },
  { key: 'funding', label: 'Funding' },
  { key: 'backing', label: 'Contributions' },
  { key: 'reports', label: 'Reports' },
];

const DAY = 86_400_000;

export function ActivityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const q = useNotifications(Boolean(user));
  const mine = useMyCampaigns(Boolean(user));
  const [filter, setFilter] = useState<Filter>('all');

  const read = useMutation({
    mutationFn: (ids?: string[]) => api('/notifications/read', { method: 'POST', body: { ids } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.notifications }),
    onError: (e) => toast.error(errorMessage(e)),
  });

  const ownedIds = useMemo(() => new Set((mine.data?.items ?? []).map((c) => c.id)), [mine.data]);
  const items = (q.data?.items ?? []).filter((n) => filter === 'all' || n.category === filter);
  const today = items.filter((n) => Date.now() - new Date(n.createdAt).getTime() < DAY);
  const earlier = items.filter((n) => Date.now() - new Date(n.createdAt).getTime() >= DAY);
  const unread = q.data?.unread ?? 0;

  const open = (n: NotificationItem) => {
    if (!n.readAt) read.mutate([n.id]);
    if (!n.campaignId) return;
    const isMine = ownedIds.has(n.campaignId) && n.category !== 'backing';
    if (isMine) router.push({ pathname: '/my-campaigns/[id]', params: { id: n.campaignId } });
    else router.push({ pathname: '/campaign/[slug]', params: { slug: n.campaignId } });
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={user ? <RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} tintColor={colors.ink} /> : undefined}
      >
        <View style={styles.head}>
          <Text variant="display">Activity</Text>
          {user ? (
            <Pressable onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Notification settings" hitSlop={10}>
              <Settings size={22} color={colors.ink} strokeWidth={1.5} />
            </Pressable>
          ) : null}
        </View>

        {!user ? (
          <View style={{ gap: space.lg }}>
            <Text variant="body" tone="muted">
              Sign in to follow your campaigns: review decisions, funding milestones, payments and reports all show up here.
            </Text>
            <Button label="Sign in" onPress={() => router.push('/auth')} />
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
              {filters.map((f) => (
                <Chip key={f.key} label={f.label} selected={filter === f.key} onPress={() => setFilter(f.key)} />
              ))}
            </ScrollView>

            {unread > 0 ? (
              <View style={styles.bar}>
                <Text variant="caption" tone="muted">
                  {unread} unread
                </Text>
                <Pressable onPress={() => read.mutate(undefined)} accessibilityRole="button" hitSlop={8}>
                  <Text variant="label" tone="action">
                    Mark all read
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {q.isLoading ? (
              <View style={{ gap: space.md }}>
                <Skeleton height={64} />
                <Skeleton height={64} />
                <Skeleton height={64} />
              </View>
            ) : q.isError ? (
              <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
            ) : items.length === 0 ? (
              <EmptyState
                title={filter === 'all' ? 'Nothing yet' : 'Nothing in this view'}
                message={filter === 'all' ? 'When your campaigns move through review and funding, or you back one, updates appear here.' : 'No notifications in this category.'}
                actionLabel={filter === 'all' ? undefined : 'Show all'}
                onAction={filter === 'all' ? undefined : () => setFilter('all')}
              />
            ) : (
              <View>
                {today.length > 0 ? <Group title="Today" items={today} onOpen={open} /> : null}
                {earlier.length > 0 ? <Group title="Earlier" items={earlier} onOpen={open} /> : null}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Group({ title, items, onOpen }: { title: string; items: NotificationItem[]; onOpen: (n: NotificationItem) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text variant="kicker" tone="muted" style={{ marginBottom: space.xs }}>
        {title}
      </Text>
      {items.map((n) => (
        <Pressable
          key={n.id}
          onPress={() => onOpen(n)}
          accessibilityRole="button"
          accessibilityLabel={`${n.readAt ? '' : 'Unread. '}${n.title}. ${n.body}`}
          style={[styles.item, { borderColor: colors.rule }]}
        >
          <View style={[styles.dot, { backgroundColor: n.readAt ? 'transparent' : colors.action }]} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="label" style={{ fontFamily: n.readAt ? fonts.sansMedium : fonts.sansBold }}>
              {n.title}
            </Text>
            <Text variant="bodySm" tone="muted">
              {n.body}
            </Text>
            <Text variant="caption" tone="muted">
              {timeAgo(n.createdAt)}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: layout.gutter, paddingBottom: space.x5, gap: space.lg, width: '100%', maxWidth: layout.maxContent, alignSelf: 'center' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: space.sm },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  item: { flexDirection: 'row', gap: space.md, paddingVertical: space.lg, borderTopWidth: 1, alignItems: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
});
