import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Mic, PenLine } from 'lucide-react-native';
import { api, errorMessage } from '@/api/client';
import { useMyCampaigns } from '@/api/hooks';
import { Button, EmptyState, ErrorState, Screen, Sheet, Skeleton, StatusChip, Text } from '@/components/ui';
import { statusLabel, timeAgo } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { radius, space, useTheme } from '@/theme';
import type { OwnerCampaign } from '@/types/api';

export function CreateEntryScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const mine = useMyCampaigns(Boolean(user));
  const [toDelete, setToDelete] = useState<OwnerCampaign | null>(null);

  const start = useMutation({
    mutationFn: () => api<{ campaign: { id: string } }>('/campaigns', { method: 'POST', body: {} }),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: ['campaigns', 'mine'] });
      router.push({ pathname: '/create/[id]', params: { id: r.campaign.id } });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/campaigns/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setToDelete(null);
      toast.success('Draft deleted.');
      void qc.invalidateQueries({ queryKey: ['campaigns', 'mine'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!user) {
    return (
      <Screen>
        <View style={{ gap: space.xl, paddingTop: space.x3 }}>
          <View style={{ gap: space.sm }}>
            <Text variant="kicker" tone="action">
              Start your journey
            </Text>
            <Text variant="display">Let’s build your big idea</Text>
            <Text variant="body" tone="muted">
              Create a campaign in five short steps. Your work saves as a private draft until you submit it for review. You need an account so your drafts stay yours.
            </Text>
          </View>
          <Button label="Sign in" onPress={() => router.push('/auth')} />
          <Button label="Create an account" variant="secondary" onPress={() => router.push({ pathname: '/auth', params: { mode: 'signup' } })} />
        </View>
      </Screen>
    );
  }

  const drafts = (mine.data?.items ?? []).filter((c) => c.draft.status === 'draft' || c.draft.status === 'changes_requested');

  return (
    <Screen>
      <View style={{ gap: space.xl, paddingTop: space.lg }}>
        <View style={{ gap: space.sm }}>
          <Text variant="kicker" tone="action">
            Start your journey
          </Text>
          <Text variant="display">Let’s build your big idea</Text>
          <Text variant="body" tone="muted">
            Five steps: basics, story, visuals, reach and submit. Everything saves as you go.
          </Text>
        </View>

        <Pressable
          onPress={() => start.mutate()}
          disabled={start.isPending}
          accessibilityRole="button"
          accessibilityLabel="Create manually"
          style={({ pressed }) => [styles.option, { borderColor: colors.ink, backgroundColor: colors.surface, opacity: pressed || start.isPending ? 0.85 : 1 }]}
        >
          <PenLine size={26} color={colors.ink} strokeWidth={1.5} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="heading">Create manually</Text>
            <Text variant="bodySm" tone="muted">
              Work through the steps yourself, with tips along the way and a full preview before you submit.
            </Text>
          </View>
          <ArrowRight size={22} color={colors.ink} strokeWidth={1.75} />
        </Pressable>

        <View style={[styles.option, { borderColor: colors.rule, backgroundColor: 'transparent' }]} accessibilityLabel="Create with your voice, coming soon">
          <Mic size={26} color={colors.inkMuted} strokeWidth={1.5} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="heading" tone="muted">
              Create with your voice
            </Text>
            <Text variant="bodySm" tone="muted">
              Answer a few questions out loud and we fill in the steps. Coming soon. For now, step one can draft everything from a short description.
            </Text>
          </View>
          <StatusChip label="Soon" />
        </View>

        <View style={{ gap: space.md }}>
          <Text variant="title">Your drafts</Text>
          {mine.isLoading ? (
            <Skeleton height={86} />
          ) : mine.isError ? (
            <ErrorState message={errorMessage(mine.error)} onRetry={() => mine.refetch()} />
          ) : drafts.length === 0 ? (
            <EmptyState title="No drafts yet" message="When you start a campaign it saves here, so you can come back and finish it." />
          ) : (
            drafts.map((c) => (
              <View key={c.id} style={[styles.draft, { borderColor: colors.rule, backgroundColor: colors.surface }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <StatusChip label={statusLabel(c.draft.status)} tone={c.draft.status === 'changes_requested' ? 'warn' : 'neutral'} />
                  <Text variant="caption" tone="muted">
                    Edited {timeAgo(c.draft.updatedAt)}
                  </Text>
                </View>
                <Text variant="heading" numberOfLines={2}>
                  {c.draft.title || 'Untitled draft'}
                </Text>
                {c.draft.review.changeRequest ? (
                  <Text variant="bodySm" tone="muted">
                    Reviewer: {c.draft.review.changeRequest}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: space.sm }}>
                  <Button label="Continue editing" size="sm" onPress={() => router.push({ pathname: '/create/[id]', params: { id: c.id } })} fullWidth={false} />
                  {c.draft.status === 'draft' ? <Button label="Delete" variant="danger" size="sm" onPress={() => setToDelete(c)} fullWidth={false} /> : null}
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      <Sheet visible={Boolean(toDelete)} title="Delete this draft?" onClose={() => setToDelete(null)}>
        <Text variant="body">“{toDelete?.draft.title || 'Untitled draft'}” will be deleted. This cannot be undone.</Text>
        <Button label="Delete draft" variant="danger" onPress={() => toDelete && remove.mutate(toDelete.id)} loading={remove.isPending} />
        <Button label="Keep it" variant="ghost" onPress={() => setToDelete(null)} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: space.lg, borderWidth: 1.5, borderRadius: radius.md, padding: space.lg, minHeight: 88 },
  draft: { borderWidth: 1, borderRadius: radius.md, padding: space.lg, gap: space.md },
});
