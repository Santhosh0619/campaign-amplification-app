import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { CampaignCard } from '@/components/campaign/CampaignCard';
import { EmptyState, ErrorState, Screen, ScreenHeader, Skeleton } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { space } from '@/theme';
import type { CampaignCard as Card } from '@/types/api';

export function SavedScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const q = useQuery({ queryKey: ['saved'], queryFn: () => api<{ items: Card[] }>('/me/saved'), enabled: Boolean(user) });

  return (
    <Screen>
      <ScreenHeader title="Saved campaigns" />
      {!user ? (
        <EmptyState title="Sign in to save campaigns" message="Saved campaigns are kept on your account." actionLabel="Sign in" onAction={() => router.push('/auth')} />
      ) : q.isLoading ? (
        <Skeleton height={200} />
      ) : q.isError ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      ) : (q.data?.items.length ?? 0) === 0 ? (
        <EmptyState title="Nothing saved yet" message="Tap Save on a campaign to keep it here for later." actionLabel="Explore campaigns" onAction={() => router.push('/explore')} />
      ) : (
        <View style={{ gap: space.lg }}>
          {q.data!.items.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </View>
      )}
    </Screen>
  );
}
