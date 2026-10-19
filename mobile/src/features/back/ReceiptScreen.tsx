import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { Button, Divider, ErrorState, Screen, ScreenHeader, Skeleton, StatusChip, Text } from '@/components/ui';
import { money, number, shortDate } from '@/lib/format';
import { space } from '@/theme';
import type { CampaignCard, Contribution } from '@/types/api';

export function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useQuery({ queryKey: ['contribution', id], queryFn: () => api<{ contribution: Contribution; campaign: CampaignCard }>(`/contributions/${id}`), enabled: Boolean(id) });

  if (q.isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Receipt" />
        <Skeleton height={200} />
      </Screen>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Screen>
        <ScreenHeader title="Receipt" />
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  const { contribution: k, campaign: c } = q.data;
  const tone = k.status === 'succeeded' ? 'positive' : k.status === 'pending' ? 'warn' : 'danger';

  return (
    <Screen>
      <ScreenHeader title="Receipt" />
      <View style={{ gap: space.lg }}>
        <StatusChip label={k.status.replace(/_/g, ' ')} tone={tone} />
        <Text variant="title">{c.title}</Text>
        <Text variant="caption" tone="muted">
          Receipt {k.receiptNo} · {shortDate(k.createdAt)}
        </Text>
        <Divider strong />
        <Line label="Contribution" value={money(k.amount, { cents: true })} />
        <Line label="Card processing fee" value={money(k.fee, { cents: true })} />
        <Divider />
        <Line label="Total paid" value={money(k.total, { cents: true })} strong />
        <Line label="Estimated reach" value={`≈ ${number(k.estimatedReach)} people`} />
        <Text variant="caption" tone="muted">
          Test payment: no money moved. The contribution pays for message amplification, not direct support for the cause.
        </Text>
        <Button label="View campaign" variant="secondary" onPress={() => router.push({ pathname: '/campaign/[slug]', params: { slug: c.slug } })} />
      </View>
    </Screen>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.line}>
      <Text variant={strong ? 'label' : 'bodySm'} tone={strong ? 'ink' : 'muted'}>
        {label}
      </Text>
      <Text variant={strong ? 'number' : 'label'}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' } });
