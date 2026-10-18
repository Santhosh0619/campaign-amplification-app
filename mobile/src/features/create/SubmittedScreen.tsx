import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react-native';
import { api, errorMessage } from '@/api/client';
import { useConfig } from '@/api/hooks';
import { Button, Screen, Text } from '@/components/ui';
import { toast } from '@/store/toast';
import { space, useTheme } from '@/theme';

type Props = { campaignId: string; slug: string; title: string };

export function SubmittedScreen({ campaignId, slug, title }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const cfg = useConfig();
  const qc = useQueryClient();

  // Demo tooling: stands in for the reviewer so the full journey can be shown without waiting a day.
  const skip = useMutation({
    mutationFn: async () => {
      await api(`/campaigns/${campaignId}/demo-advance`, { method: 'POST', body: { action: 'approve' } });
      await api(`/campaigns/${campaignId}/demo-advance`, { method: 'POST', body: { action: 'next' } });
    },
    onSuccess: () => {
      toast.success('Approved in demo review. The campaign is now open for backing.');
      void qc.invalidateQueries({ queryKey: ['campaigns'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      router.replace({ pathname: '/campaign/[slug]', params: { slug } });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const steps = [
    { label: 'Submitted', note: 'Your campaign is in the queue.', state: 'done' },
    { label: 'In review', note: `A reviewer checks the claims against your sources. About ${cfg.reviewHours} hours.`, state: 'now' },
    { label: 'Decision', note: 'You get notes, and a chance to revise if changes are needed.', state: 'todo' },
    { label: 'Open for backing', note: 'Once approved, your campaign goes public and can receive contributions.', state: 'todo' },
  ] as const;

  return (
    <Screen>
      <View style={{ gap: space.xl, paddingTop: space.xl }} accessibilityLiveRegion="polite">
        <View style={[styles.head, { borderColor: colors.positive }]}>
          <View style={[styles.icon, { backgroundColor: colors.positive }]}>
            <Check size={26} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text variant="title">Submitted for review</Text>
          <Text variant="body" tone="muted">
            “{title || 'Your campaign'}” is with the reviewers. We will notify you when there is a decision.
          </Text>
        </View>

        <View>
          {steps.map((s, i) => (
            <View key={s.label} style={styles.step}>
              <View style={{ alignItems: 'center' }}>
                <View style={[styles.dot, { backgroundColor: s.state === 'done' ? colors.positive : s.state === 'now' ? colors.action : 'transparent', borderColor: s.state === 'todo' ? colors.rule : 'transparent' }]} />
                {i < steps.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: colors.rule }} /> : null}
              </View>
              <View style={{ flex: 1, paddingBottom: space.lg, gap: 2 }}>
                <Text variant="label" tone={s.state === 'todo' ? 'muted' : 'ink'}>
                  {s.label}
                </Text>
                <Text variant="bodySm" tone="muted">
                  {s.note}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Button label="See my campaigns" onPress={() => router.replace('/profile')} />
        <Button label="Back to home" variant="ghost" onPress={() => router.replace('/')} />

        {cfg.demoMode ? (
          <View style={[styles.demo, { borderColor: colors.rule }]}>
            <Text variant="kicker" tone="muted">
              Demo tools
            </Text>
            <Text variant="bodySm" tone="muted">
              Reviewing the prototype? Skip the wait: this plays the reviewer and opens the campaign for backing.
            </Text>
            <Button label="Approve and open for backing (demo)" variant="secondary" size="sm" onPress={() => skip.mutate()} loading={skip.isPending} fullWidth={false} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { borderTopWidth: 3, paddingTop: space.xl, gap: space.md },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', gap: space.lg },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, marginTop: 3 },
  demo: { borderTopWidth: 1, paddingTop: space.lg, gap: space.sm },
});
