import { useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { useCampaign, useReports } from '@/api/hooks';
import { ReportCard } from '@/components/campaign/ReportCard';
import { Button, Divider, ErrorState, Field, ProgressBar, Screen, ScreenHeader, Skeleton, StatusChip, Text } from '@/components/ui';
import { compact, daysLeftLabel, money, number, shortDate, statusLabel } from '@/lib/format';
import { toast } from '@/store/toast';
import { space, useTheme } from '@/theme';
import type { OwnerCampaign, Report } from '@/types/api';
import { statusTone } from './MyCampaignsScreen';

type Action = 'next' | 'approve' | 'request_changes' | 'reject';

const nextStep: Partial<Record<string, { label: string; note: string }>> = {
  submitted: { label: 'Approve (demo reviewer)', note: 'Plays the reviewer: approves the campaign.' },
  approved: { label: 'Open for backing (demo)', note: 'Publishes the campaign and starts the funding window.' },
  available_for_funding: { label: 'Simulate goal reached (demo)', note: 'Pretends the remaining backers arrived. Ads still do not start by themselves.' },
  goal_reached: { label: 'Prepare distribution (demo)', note: 'Reviewers set up ads on the chosen networks.' },
  distribution_preparation: { label: 'Start promotion (demo)', note: 'Ads go live and early delivery numbers appear.' },
  promoting: { label: 'Finish campaign (demo)', note: 'Publishes the final distribution report.' },
};

export function ManageCampaignScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const q = useCampaign(String(id));
  const reports = useReports(String(id));
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['campaigns'] });
    void qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const advance = useMutation({
    mutationFn: (action: Action) => api(`/campaigns/${id}/demo-advance`, { method: 'POST', body: { action } }),
    onSuccess: () => {
      toast.success('Campaign moved to the next stage.');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const post = useMutation({
    mutationFn: () => api(`/campaigns/${id}/updates`, { method: 'POST', body: { title, body } }),
    onSuccess: () => {
      setTitle('');
      setBody('');
      setFormError(null);
      toast.success('Update posted for your backers.');
      refresh();
    },
    onError: (e) => setFormError(errorMessage(e)),
  });

  if (q.isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Campaign" />
        <Skeleton height={26} width="70%" />
        <Skeleton height={120} style={{ marginTop: space.lg }} />
      </Screen>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Screen>
        <ScreenHeader title="Campaign" />
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      </Screen>
    );
  }

  const c = q.data.campaign as OwnerCampaign;
  const live = ['available_for_funding', 'goal_reached', 'distribution_preparation', 'promoting', 'completed'].includes(c.status);
  const items: Report[] = reports.data?.items ?? [];
  const latest = items.find((r) => r.metrics && r.kind !== 'milestone');
  const m = latest?.metrics;
  const step = nextStep[c.status];

  const share = async () => {
    try {
      await Share.share({ message: `${c.title}: https://campaign.example.com/c/${c.slug}` });
    } catch {
      toast.info('Sharing is not available here.');
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Manage campaign" />
      <View style={{ gap: space.xl }}>
        <View style={{ gap: space.sm }}>
          <StatusChip label={statusLabel(c.status)} tone={statusTone(c.status)} />
          <Text variant="title">{c.title || 'Untitled draft'}</Text>
          <Text variant="caption" tone="muted">
            Submitted {shortDate(c.submittedAt) || '—'} · Goal {money(c.goalAmount)}
          </Text>
        </View>

        {c.status === 'changes_requested' || c.status === 'rejected' ? (
          <View style={[styles.note, { borderColor: c.status === 'rejected' ? colors.danger : colors.warn, backgroundColor: c.status === 'rejected' ? colors.dangerSoft : colors.warnSoft }]}>
            <Text variant="label">{c.status === 'rejected' ? 'Not approved' : 'The reviewer asked for changes'}</Text>
            <Text variant="bodySm">{c.draft.review.rejectionReason ?? c.draft.review.changeRequest}</Text>
            {c.status === 'changes_requested' ? <Button label="Edit and resubmit" size="sm" onPress={() => router.push({ pathname: '/create/[id]', params: { id: c.id } })} fullWidth={false} /> : null}
          </View>
        ) : null}

        {c.status === 'draft' ? <Button label="Continue editing" onPress={() => router.push({ pathname: '/create/[id]', params: { id: c.id } })} /> : null}

        {live ? (
          <View style={{ gap: space.md }}>
            <Text variant="heading">Funding</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text variant="numberLg">{money(c.raisedAmount)}</Text>
              <Text variant="caption" tone="muted">
                of {money(c.goalAmount)} · {c.percentFunded}%
              </Text>
            </View>
            <ProgressBar value={c.percentFunded / 100} />
            <Text variant="caption" tone="muted">
              {number(c.backersCount)} backers · {c.status === 'available_for_funding' ? daysLeftLabel(c.daysLeft, c.status) : statusLabel(c.status)}
            </Text>
            <Text variant="caption" tone="muted">
              Reaching the goal does not start ads by itself. Distribution begins only after review, payment and ad setup are done.
            </Text>
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button label="View page" variant="secondary" size="sm" onPress={() => router.push({ pathname: '/campaign/[slug]', params: { slug: c.slug } })} fullWidth={false} />
              <Button label="Share link" variant="secondary" size="sm" onPress={share} fullWidth={false} />
            </View>
          </View>
        ) : null}

        {live ? (
          <View style={{ gap: space.md }}>
            <Text variant="heading">Analytics</Text>
            <View style={styles.grid}>
              <Metric label="Raised" value={money(c.raisedAmount)} />
              <Metric label="Ad budget allocated" value={money(Math.round(c.raisedAmount * 0.8))} />
              <Metric label="Ad spend so far" value={m ? money(m.adSpend) : '—'} />
              <Metric label={m?.reachKind === 'measured' ? 'Reach (measured)' : 'Reach (estimated)'} value={compact(m?.reach ?? Math.round(c.raisedAmount * 27))} />
              <Metric label="Impressions" value={m ? compact(m.impressions) : '—'} />
              <Metric label="Link clicks" value={m ? number(m.clicks) : '—'} />
            </View>
            <Text variant="caption" tone="muted">
              Estimates and measured results are labelled separately. Measured figures appear once the ad platforms report them.
            </Text>
          </View>
        ) : null}

        {c.review.trust ? (
          <View style={{ gap: 4 }}>
            <Text variant="heading">Review</Text>
            <Text variant="bodySm" tone="muted">
              Demo review score {c.review.trust.score} · {c.review.trust.label}. Shown to readers as a demo score.
            </Text>
          </View>
        ) : null}

        {live ? (
          <View style={{ gap: space.md }}>
            <Text variant="heading">Post an update</Text>
            <Field label="Title" value={title} onChangeText={setTitle} maxLength={80} />
            <Field label="Update" value={body} onChangeText={setBody} multiline minHeight={90} maxLength={1200} error={formError} />
            <Button label="Post update" variant="dark" size="sm" loading={post.isPending} disabled={title.trim().length < 3 || body.trim().length < 10} onPress={() => post.mutate()} fullWidth={false} />
            <Text variant="caption" tone="muted">
              Material changes to a published campaign go back through review before the ads are updated.
            </Text>
          </View>
        ) : null}

        {items.length > 0 ? (
          <View>
            <Text variant="heading" style={{ marginBottom: space.sm }}>
              Updates and reports
            </Text>
            {items.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </View>
        ) : null}

        {step ? (
          <View style={[styles.demo, { borderColor: colors.rule }]}>
            <Text variant="kicker" tone="muted">
              Demo tools
            </Text>
            <Text variant="bodySm" tone="muted">
              {step.note}
            </Text>
            <Button label={step.label} variant="secondary" size="sm" onPress={() => advance.mutate('next')} loading={advance.isPending} fullWidth={false} />
            {c.status === 'submitted' ? (
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button label="Request changes" variant="ghost" size="sm" onPress={() => advance.mutate('request_changes')} fullWidth={false} />
                <Button label="Reject" variant="danger" size="sm" onPress={() => advance.mutate('reject')} fullWidth={false} />
              </View>
            ) : null}
          </View>
        ) : null}
        <Divider />
      </View>
    </Screen>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '50%', gap: 2 }}>
      <Text variant="number">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { borderLeftWidth: 3, padding: space.lg, gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.lg },
  demo: { borderTopWidth: 1, paddingTop: space.lg, gap: space.sm },
});
