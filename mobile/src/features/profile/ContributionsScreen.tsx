import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { EmptyState, ErrorState, Screen, ScreenHeader, Skeleton, StatusChip, Text } from '@/components/ui';
import { money, shortDate } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { space, useTheme } from '@/theme';
import type { CampaignCard, Contribution } from '@/types/api';

type Item = Contribution & { campaign: CampaignCard | null };

export function ContributionsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuth((s) => s.user);
  const q = useQuery({ queryKey: ['contributions', 'mine'], queryFn: () => api<{ items: Item[] }>('/contributions/mine'), enabled: Boolean(user) });

  return (
    <Screen>
      <ScreenHeader title="Contributions" />
      {!user ? (
        <EmptyState title="Sign in to see your payments" message="Guest contributions are not listed here. Your receipt was sent to the email you gave." actionLabel="Sign in" onAction={() => router.push('/auth')} />
      ) : q.isLoading ? (
        <Skeleton height={90} />
      ) : q.isError ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (q.data?.items.length ?? 0) === 0 ? (
        <EmptyState title="No contributions yet" message="When you back a campaign while signed in, your payment history and receipts appear here." actionLabel="Browse campaigns" onAction={() => router.push('/explore')} />
      ) : (
        <View style={{ gap: space.sm }}>
          <Text variant="caption" tone="muted">
            These pay for message amplification, not direct support for a cause.
          </Text>
          {q.data!.items.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => router.push({ pathname: '/receipt/[id]', params: { id: c.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Receipt ${c.receiptNo}`}
              style={{ borderTopWidth: 1, borderColor: colors.rule, paddingVertical: space.lg, gap: 6 }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <StatusChip label={c.status.replace(/_/g, ' ')} tone={c.status === 'succeeded' ? 'positive' : c.status === 'pending' ? 'warn' : 'danger'} />
                <Text variant="caption" tone="muted">
                  {shortDate(c.createdAt)}
                </Text>
              </View>
              <Text variant="heading" numberOfLines={2}>
                {c.campaign?.title ?? 'Campaign'}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text variant="caption" tone="muted">
                  Receipt {c.receiptNo}
                </Text>
                <Text variant="number">{money(c.total, { cents: true })}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
