import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, Share, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, CircleAlert, Clock3, Ban } from 'lucide-react-native';
import { api, errorMessage } from '@/api/client';
import { useCampaign, useConfig } from '@/api/hooks';
import { EstimateNote } from '@/components/campaign/EstimateNote';
import { UseOfFunds } from '@/components/campaign/UseOfFunds';
import { Accordion, Button, Chip, Divider, ErrorState, Field, ProgressBar, Screen, ScreenHeader, Skeleton, Text } from '@/components/ui';
import { money, number } from '@/lib/format';
import { localQuote } from '@/lib/reach';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { fonts, radius, space, useTheme } from '@/theme';
import type { CampaignCard, CampaignDetail, Contribution, Quote } from '@/types/api';

type Step = 'amount' | 'review' | 'pay' | 'result';
type Outcome = 'success' | 'pending' | 'fail';

const STEPS: { key: Step; label: string }[] = [
  { key: 'amount', label: 'Amount' },
  { key: 'review', label: 'Review' },
  { key: 'pay', label: 'Pay' },
  { key: 'result', label: 'Done' },
];

export function BackFlowScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const cfg = useConfig();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const query = useCampaign(String(slug));

  const [step, setStep] = useState<Step>('amount');
  const [preset, setPreset] = useState<number | 'other'>(25);
  const [custom, setCustom] = useState('');
  const [showName, setShowName] = useState(false);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [ack, setAck] = useState(false);
  const [ackError, setAckError] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>('success');
  const [contribution, setContribution] = useState<Contribution | null>(null);
  const [resultCampaign, setResultCampaign] = useState<CampaignCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amount = preset === 'other' ? Number(custom) : preset;
  const amountValid = Number.isFinite(amount) && amount >= 1 && amount <= 5000;
  const q: Quote = useMemo(() => localQuote(amountValid ? amount : 0, cfg), [amount, amountValid, cfg]);

  // Step back inside the flow (including the Android hardware back button) before leaving it.
  const goBack = useCallback(() => {
    if (step === 'review') setStep('amount');
    else if (step === 'pay') setStep('review');
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [step, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 'result') return false;
      if (step === 'amount') return false;
      goBack();
      return true;
    });
    return () => sub.remove();
  }, [step, goBack]);

  const create = useMutation({
    mutationFn: () =>
      api<{ contribution: Contribution; quote: Quote }>('/contributions', {
        method: 'POST',
        body: { campaignId: String(slug), amount, showFirstName: user ? showName : false, guestEmail: user ? undefined : email.trim() },
      }),
    onSuccess: (r) => {
      setContribution(r.contribution);
      setError(null);
      setStep('pay');
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const settle = useMutation({
    mutationFn: (o: 'success' | 'fail' | 'cancel' | 'pending') => api<{ contribution: Contribution; campaign: CampaignCard }>(`/contributions/${contribution!.id}/simulate`, { method: 'POST', body: { outcome: o } }),
    onSuccess: (r) => {
      setContribution(r.contribution);
      setResultCampaign(r.campaign);
      setStep('result');
      void qc.invalidateQueries({ queryKey: ['campaigns'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => setError(errorMessage(e)),
  });

  if (query.isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Back this campaign" />
        <Skeleton height={26} width="70%" />
        <Skeleton height={80} style={{ marginTop: space.lg }} />
      </Screen>
    );
  }
  if (query.isError || !query.data) {
    return (
      <Screen>
        <ScreenHeader title="Back this campaign" />
        <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
      </Screen>
    );
  }
  const c = query.data.campaign as CampaignDetail;
  if (!c.canBack && step !== 'result') {
    return (
      <Screen>
        <ScreenHeader title="Back this campaign" />
        <ErrorState
          title="Not open for backing"
          message="This campaign is not accepting contributions right now. It may be fully funded, in review or finished."
          onRetry={() => router.replace({ pathname: '/campaign/[slug]', params: { slug: c.slug } })}
        />
      </Screen>
    );
  }

  const afterRaised = c.raisedAmount + (amountValid ? amount : 0);
  const afterPct = Math.min(100, Math.round((afterRaised / c.goalAmount) * 100));

  const toReview = () => {
    setError(null);
    if (!amountValid) {
      setError(amount > 5000 ? 'The maximum contribution is $5,000.' : 'Choose an amount of at least $1.');
      return;
    }
    if (!user && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setEmailError('Enter an email so we can send your receipt.');
      return;
    }
    setEmailError(null);
    setStep('review');
  };

  const toPay = () => {
    if (!ack) {
      setAckError(true);
      return;
    }
    setAckError(false);
    create.mutate();
  };

  const share = async () => {
    try {
      await Share.share({ message: `I just backed “${c.title}” on Campaign. https://campaign.example.com/c/${c.slug}` });
    } catch {
      toast.info('Sharing is not available here.');
    }
  };

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <Screen>
      <ScreenHeader title="Back this campaign" onBack={goBack} hideBack={step === 'result'} />

      <View style={styles.steps} accessibilityLabel={`Step ${stepIndex + 1} of 4`}>
        {STEPS.map((s, i) => (
          <View key={s.key} style={{ flex: 1, gap: 6 }}>
            <View style={{ height: 3, backgroundColor: i <= stepIndex ? colors.ink : colors.rule }} />
            <Text variant="caption" tone={i === stepIndex ? 'ink' : 'muted'} style={{ fontFamily: i === stepIndex ? fonts.sansSemi : fonts.sans }}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={{ gap: 2, marginBottom: space.xl }}>
        <Text variant="kicker" tone="muted">
          You are funding
        </Text>
        <Text variant="title">{c.title}</Text>
        <Text variant="caption" tone="muted">
          by {c.creatorName}
        </Text>
      </View>

      {step === 'amount' ? (
        <View style={{ gap: space.xl }}>
          <View style={{ gap: space.md }}>
            <Text variant="label">Choose an amount</Text>
            <View style={styles.presets}>
              {cfg.presets.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => {
                    setPreset(p);
                    setError(null);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: preset === p }}
                  style={[styles.preset, { borderColor: preset === p ? colors.ink : colors.rule, backgroundColor: preset === p ? colors.ink : colors.surface }]}
                >
                  <Text variant="number" style={{ color: preset === p ? colors.bg : colors.ink }}>
                    ${p}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={() => setPreset('other')}
                accessibilityRole="radio"
                accessibilityState={{ selected: preset === 'other' }}
                style={[styles.preset, { borderColor: preset === 'other' ? colors.ink : colors.rule, backgroundColor: preset === 'other' ? colors.ink : colors.surface }]}
              >
                <Text variant="label" style={{ color: preset === 'other' ? colors.bg : colors.ink }}>
                  Other
                </Text>
              </Pressable>
            </View>
            {preset === 'other' ? (
              <View style={[styles.customRow, { borderColor: colors.ink, backgroundColor: colors.surface }]}>
                <Text variant="number">$</Text>
                <TextInput
                  value={custom}
                  onChangeText={(t) => {
                    setCustom(t.replace(/[^0-9.]/g, '').slice(0, 7));
                    setError(null);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="Enter amount"
                  placeholderTextColor={colors.inkMuted}
                  accessibilityLabel="Custom amount in dollars"
                  autoFocus
                  style={[styles.customInput, { color: colors.ink }]}
                />
              </View>
            ) : null}
            <Text variant="caption" tone="muted">
              From $1 to $5,000. Card fees are shown on the next step.
            </Text>
          </View>

          <View style={[styles.reach, { borderColor: colors.ink }]}>
            <Text variant="numberLg" tone="action">
              ≈ {number(q.estimatedReach)}
            </Text>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="label">{amountValid ? 'people may see this message' : 'Choose an amount to see reach'}</Text>
              <EstimateNote>{`Estimate: about ${cfg.reachPerDollar} people per $1`}</EstimateNote>
            </View>
          </View>

          {user ? (
            <View style={[styles.switchRow, { borderColor: colors.rule }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="label">Show my first name as a backer</Text>
                <Text variant="caption" tone="muted">
                  Private by default. Your payment record stays accurate either way.
                </Text>
              </View>
              <Switch value={showName} onValueChange={setShowName} trackColor={{ true: colors.positive, false: colors.rule }} thumbColor="#FFFFFF" accessibilityLabel="Show my first name as a backer" />
            </View>
          ) : (
            <View style={{ gap: space.sm }}>
              <Field
                label="Email for your receipt"
                required
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setEmailError(null);
                }}
                error={emailError}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                hint="You are backing as a guest. We only use this to send the receipt. Your name stays private."
              />
              <Pressable onPress={() => router.push('/auth')} accessibilityRole="link">
                <Text variant="label" tone="action">
                  Have an account? Sign in instead
                </Text>
              </Pressable>
            </View>
          )}

          {error ? (
            <Text variant="bodySm" tone="danger" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Button label="Review contribution" onPress={toReview} disabled={!amountValid && preset !== 'other'} />
        </View>
      ) : null}

      {step === 'review' ? (
        <View style={{ gap: space.xl }}>
          <View style={{ gap: space.md }}>
            <Row label="Your contribution" value={money(q.amount, { cents: true })} />
            <Row label={`Card processing fee (~${(cfg.processingRate * 100).toFixed(1)}% + $${cfg.processingFixed.toFixed(2)})`} value={money(q.fee, { cents: true })} />
            <Divider />
            <Row label="Total you pay" value={money(q.total, { cents: true })} strong />
          </View>

          <View style={{ gap: space.sm }}>
            <Text variant="label">Where your {money(q.amount, { cents: true })} goes</Text>
            <Row label={`Ads that show the message (${Math.round((1 - cfg.platformFeeRate) * 100)}%)`} value={money(q.adShare, { cents: true })} />
            <Row label={`Platform fee (${Math.round(cfg.platformFeeRate * 100)}%)`} value={money(q.platformShare, { cents: true })} />
          </View>

          <View style={[styles.reach, { borderColor: colors.ink }]}>
            <Text variant="numberLg" tone="action">
              ≈ {number(q.estimatedReach)}
            </Text>
            <View style={{ flex: 1, gap: 4 }}>
              <Text variant="label">people may see this message</Text>
              <EstimateNote>Estimate, not a promise</EstimateNote>
            </View>
          </View>

          <View style={{ gap: space.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="label">Funding after your contribution</Text>
              <Text variant="label">{afterPct}%</Text>
            </View>
            <ProgressBar value={afterPct / 100} />
            <Text variant="caption" tone="muted">
              {money(afterRaised)} of {money(c.goalAmount)}
            </Text>
          </View>

          <View>
            <Accordion title="Terms, fees and refunds">
              <UseOfFunds goalAmount={c.goalAmount} />
            </Accordion>
            <Divider />
          </View>

          <Pressable
            onPress={() => {
              setAck((v) => !v);
              setAckError(false);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ack }}
            style={styles.ack}
          >
            <View style={[styles.box, { borderColor: ackError ? colors.danger : colors.ink, backgroundColor: ack ? colors.ink : 'transparent' }]}>
              {ack ? <Check size={16} color={colors.bg} strokeWidth={3} /> : null}
            </View>
            <Text variant="bodySm" style={{ flex: 1 }} tone={ackError ? 'danger' : 'ink'}>
              I understand this contribution pays to amplify the message with ads. It does not directly support the cause, person or organisation it describes.
            </Text>
          </Pressable>

          {error ? (
            <Text variant="bodySm" tone="danger" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Button label={`Continue to payment · ${money(q.total, { cents: true })}`} onPress={toPay} loading={create.isPending} />
        </View>
      ) : null}

      {step === 'pay' && contribution ? (
        <View style={{ gap: space.xl }}>
          <View style={[styles.demo, { borderColor: colors.warn, backgroundColor: colors.warnSoft }]}>
            <Text variant="kicker" tone="warn">
              Test payment
            </Text>
            <Text variant="bodySm">No real card is used and no money moves. Choose how the payment provider should respond to see each state.</Text>
          </View>

          <View style={{ gap: space.sm }}>
            <Text variant="label">Simulated result</Text>
            <View style={styles.outcomes}>
              <Chip label="Approved" selected={outcome === 'success'} onPress={() => setOutcome('success')} />
              <Chip label="Pending" selected={outcome === 'pending'} onPress={() => setOutcome('pending')} />
              <Chip label="Declined" selected={outcome === 'fail'} onPress={() => setOutcome('fail')} />
            </View>
          </View>

          <Row label="Total" value={money(contribution.total, { cents: true })} strong />

          {error ? (
            <Text variant="bodySm" tone="danger" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <Button label={`Pay ${money(contribution.total, { cents: true })}`} loading={settle.isPending} onPress={() => settle.mutate(outcome === 'success' ? 'success' : outcome === 'fail' ? 'fail' : 'pending')} />
          <Button label="Cancel payment" variant="ghost" disabled={settle.isPending} onPress={() => settle.mutate('cancel')} />
        </View>
      ) : null}

      {step === 'result' && contribution ? (
        <Result
          contribution={contribution}
          campaign={resultCampaign}
          title={c.title}
          onShare={share}
          onRetry={() => {
            setContribution(null);
            setStep('review');
          }}
          onChangeAmount={() => {
            setContribution(null);
            setStep('amount');
          }}
          onConfirmPending={() => settle.mutate('success')}
          confirming={settle.isPending}
          onViewCampaign={() => router.replace({ pathname: '/campaign/[slug]', params: { slug: c.slug } })}
          onReceipt={() => router.push({ pathname: '/receipt/[id]', params: { id: contribution.id } })}
          onDone={() => router.replace('/')}
        />
      ) : null}
    </Screen>
  );
}

type ResultProps = {
  contribution: Contribution;
  campaign: CampaignCard | null;
  title: string;
  onShare: () => void;
  onRetry: () => void;
  onChangeAmount: () => void;
  onConfirmPending: () => void;
  confirming: boolean;
  onViewCampaign: () => void;
  onReceipt: () => void;
  onDone: () => void;
};

function Result({ contribution: k, campaign, title, onShare, onRetry, onChangeAmount, onConfirmPending, confirming, onViewCampaign, onReceipt, onDone }: ResultProps) {
  const { colors } = useTheme();
  const ok = k.status === 'succeeded';

  const meta = {
    succeeded: { Icon: Check, tone: colors.positive, head: 'Thank you. Your contribution went through.', body: 'It is added to the campaign’s total. We will tell you when the ads start and when the report is ready.' },
    pending: { Icon: Clock3, tone: colors.warn, head: 'Your payment is pending.', body: 'The provider has not confirmed it yet. Nothing is added to the campaign until it clears, and you will be notified.' },
    failed: { Icon: CircleAlert, tone: colors.danger, head: 'The payment did not go through.', body: k.failureReason ?? 'Nothing was charged. You can try again.' },
    cancelled: { Icon: Ban, tone: colors.inkMuted, head: 'Payment cancelled.', body: 'You were not charged and nothing was added to the campaign.' },
    rejected: { Icon: CircleAlert, tone: colors.danger, head: 'The payment was rejected.', body: k.failureReason ?? 'The campaign stopped accepting contributions.' },
    refund_pending: { Icon: Clock3, tone: colors.warn, head: 'Refund pending.', body: 'Your refund is being processed.' },
    refunded: { Icon: Check, tone: colors.positive, head: 'Refunded.', body: 'The amount was returned to you.' },
  }[k.status];

  return (
    <View style={{ gap: space.xl }} accessibilityLiveRegion="polite">
      <View style={[styles.resultHead, { borderColor: meta.tone }]}>
        <View style={[styles.resultIcon, { backgroundColor: meta.tone }]}>
          <meta.Icon size={26} color="#FFFFFF" strokeWidth={2.2} />
        </View>
        <Text variant="title">{meta.head}</Text>
        <Text variant="body" tone="muted">
          {meta.body}
        </Text>
      </View>

      {ok ? (
        <>
          <View style={{ gap: space.md }}>
            <Row label="Contribution" value={money(k.amount, { cents: true })} />
            <Row label="Campaign" value={title} />
            <Row label="Receipt" value={k.receiptNo} />
            <Row label="Estimated reach" value={`≈ ${number(k.estimatedReach)} people`} />
          </View>
          {campaign ? (
            <View style={{ gap: space.sm }}>
              <Text variant="label">Campaign progress now</Text>
              <ProgressBar value={campaign.percentFunded / 100} />
              <Text variant="caption" tone="muted">
                {money(campaign.raisedAmount)} of {money(campaign.goalAmount)} · {campaign.percentFunded}% funded
              </Text>
            </View>
          ) : null}
          <Button label="Share this campaign" onPress={onShare} />
          <Button label="View receipt" variant="secondary" onPress={onReceipt} />
          <Button label="Back to the campaign" variant="ghost" onPress={onViewCampaign} />
        </>
      ) : null}

      {k.status === 'pending' ? (
        <>
          <Button label="Simulate provider confirmation" onPress={onConfirmPending} loading={confirming} />
          <Button label="Back to the campaign" variant="ghost" onPress={onViewCampaign} />
        </>
      ) : null}

      {k.status === 'failed' || k.status === 'rejected' ? (
        <>
          <Button label="Try again" onPress={onRetry} />
          <Button label="Change the amount" variant="secondary" onPress={onChangeAmount} />
          <Button label="Back to the campaign" variant="ghost" onPress={onViewCampaign} />
        </>
      ) : null}

      {k.status === 'cancelled' ? (
        <>
          <Button label="Start again" onPress={onChangeAmount} />
          <Button label="Back to the campaign" variant="ghost" onPress={onViewCampaign} />
        </>
      ) : null}

      <Button label="Done" variant="ghost" onPress={onDone} />
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text variant={strong ? 'label' : 'bodySm'} tone={strong ? 'ink' : 'muted'} style={{ flex: 1 }}>
        {label}
      </Text>
      <Text variant={strong ? 'number' : 'label'} style={{ textAlign: 'right', maxWidth: '55%' }}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 6, marginBottom: space.xl },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  preset: { minWidth: 88, minHeight: 56, flexGrow: 1, borderWidth: 1.5, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: space.lg, minHeight: 56 },
  customInput: { flex: 1, fontFamily: fonts.serifSemi, fontSize: 22, minHeight: 52 },
  reach: { flexDirection: 'row', alignItems: 'center', gap: space.lg, borderTopWidth: 2, borderBottomWidth: 1, paddingVertical: space.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.md, borderTopWidth: 1, borderBottomWidth: 1 },
  row: { flexDirection: 'row', gap: space.lg, alignItems: 'baseline' },
  ack: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', minHeight: 48 },
  box: { width: 24, height: 24, borderWidth: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  demo: { borderLeftWidth: 3, padding: space.lg, gap: 4 },
  outcomes: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  resultHead: { borderTopWidth: 3, paddingTop: space.xl, gap: space.md },
  resultIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});

