import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError, api, errorMessage } from '@/api/client';
import { useConfig } from '@/api/hooks';
import { Button, ErrorState, Screen, ScreenHeader, Skeleton, Text } from '@/components/ui';
import { toast } from '@/store/toast';
import { layout, space, useTheme } from '@/theme';
import { stepComplete, stepOfProblem, validateStep, type Problems, type StepIndex } from './form';
import { StepBasics } from './StepBasics';
import { StepReach } from './StepReach';
import { StepStory } from './StepStory';
import { StepSubmit } from './StepSubmit';
import { StepVisuals } from './StepVisuals';
import { Stepper } from './Stepper';
import { SubmittedScreen } from './SubmittedScreen';
import { useDraft } from './useDraft';

export function CreateWizardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const cfg = useConfig();
  const qc = useQueryClient();
  const { form, status, loadError, state, savedAt, saveError, update, saveNow } = useDraft(String(id));

  const [step, setStep] = useState<StepIndex>(0);
  const [attempted, setAttempted] = useState<Record<number, boolean>>({});
  const [terms, setTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ slug: string; title: string } | null>(null);
  const [serverProblems, setServerProblems] = useState<Problems>({});
  const scroller = useRef<ScrollViewInstance>(null);

  const goTo = useCallback((s: StepIndex) => {
    setStep(s);
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, []);

  // Open on the first step that still needs something, so resuming a draft lands in the right place.
  const resumed = useRef(false);
  useEffect(() => {
    if (!form || resumed.current) return;
    resumed.current = true;
    for (const s of [0, 1, 2, 3] as StepIndex[]) {
      if (!stepComplete(s, form, cfg.minGoal)) {
        setStep(s);
        return;
      }
    }
    setStep(4);
  }, [form, cfg.minGoal]);

  const complete = useMemo(() => (form ? ([0, 1, 2, 3, 4] as StepIndex[]).map((s) => (s === 4 ? false : stepComplete(s, form, cfg.minGoal))) : []), [form, cfg.minGoal]);
  const maxReachable = useMemo(() => {
    const firstOpen = complete.findIndex((c, i) => i < 4 && !c);
    return firstOpen === -1 ? 4 : firstOpen;
  }, [complete]);

  const liveProblems: Problems = useMemo(() => {
    if (!form) return {};
    const own = attempted[step] ? validateStep(step, form, cfg.minGoal, terms) : {};
    return { ...own, ...serverProblems };
  }, [attempted, step, form, cfg.minGoal, terms, serverProblems]);

  const leave = useCallback(async () => {
    await saveNow();
    if (router.canGoBack()) router.back();
    else router.replace('/create');
  }, [saveNow, router]);

  const back = useCallback(() => {
    if (step > 0) goTo((step - 1) as StepIndex);
    else void leave();
  }, [step, goTo, leave]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (submitted) return false;
      back();
      return true;
    });
    return () => sub.remove();
  }, [back, submitted]);

  if (loadError) {
    return (
      <Screen>
        <ScreenHeader title="New campaign" />
        <ErrorState title="Could not open this draft" message={loadError} onRetry={() => router.replace({ pathname: '/create/[id]', params: { id: String(id) } })} />
      </Screen>
    );
  }
  if (!form) {
    return (
      <Screen>
        <ScreenHeader title="New campaign" />
        <Skeleton height={32} width="60%" />
        <Skeleton height={52} style={{ marginTop: space.lg }} />
        <Skeleton height={52} style={{ marginTop: space.md }} />
      </Screen>
    );
  }
  if (submitted) return <SubmittedScreen campaignId={String(id)} slug={submitted.slug} title={submitted.title} />;
  if (status !== 'draft' && status !== 'changes_requested') {
    return (
      <Screen>
        <ScreenHeader title="Campaign" />
        <ErrorState
          title="This campaign is not editable"
          message="It has already been submitted. You can follow its progress from your campaigns."
          onRetry={() => router.replace('/profile')}
        />
      </Screen>
    );
  }

  const next = async () => {
    setAttempted((a) => ({ ...a, [step]: true }));
    const problems = validateStep(step, form, cfg.minGoal);
    if (Object.keys(problems).length > 0) {
      toast.error('Fix the highlighted items to continue.');
      scroller.current?.scrollTo({ y: 0, animated: true });
      return;
    }
    setServerProblems({});
    await saveNow();
    goTo((step + 1) as StepIndex);
  };

  const saveDraft = async () => {
    const ok = await saveNow();
    if (ok) toast.success('Draft saved. It stays private until you submit.');
    else toast.error('Could not save yet. We will keep trying.');
  };

  const submit = async () => {
    setAttempted({ 0: true, 1: true, 2: true, 3: true, 4: true });
    for (const s of [0, 1, 2, 3, 4] as StepIndex[]) {
      const problems = validateStep(s, form, cfg.minGoal, terms);
      if (Object.keys(problems).length > 0) {
        toast.error('A few things still need your attention.');
        goTo(s);
        return;
      }
    }
    setSubmitting(true);
    try {
      const saved = await saveNow();
      if (!saved) throw new ApiError(0, 'network', 'Could not save your latest changes. Check your connection and try again.');
      const res = await api<{ campaign: { slug: string; title: string } }>(`/campaigns/${id}/submit`, { method: 'POST', body: { termsAccepted: true } });
      void qc.invalidateQueries({ queryKey: ['campaigns'] });
      void qc.invalidateQueries({ queryKey: ['notifications'] });
      setSubmitted({ slug: res.campaign.slug, title: res.campaign.title });
    } catch (e) {
      if (e instanceof ApiError && e.fields) {
        setServerProblems(e.fields);
        const first = Object.keys(e.fields)[0];
        if (first) goTo(stepOfProblem(first));
      }
      toast.error(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const common = { form, update, problems: liveProblems };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title="New campaign"
        onBack={back}
        right={
          <Pressable onPress={state === 'error' ? () => void saveDraft() : undefined} accessibilityRole={state === 'error' ? 'button' : 'text'} hitSlop={8}>
            <Text variant="caption" tone={state === 'error' ? 'danger' : 'muted'} style={{ textAlign: 'right' }}>
              {state === 'saving' ? 'Saving…' : state === 'error' ? 'Retry' : state === 'dirty' ? 'Editing' : savedAt ? 'Saved' : ''}
            </Text>
          </Pressable>
        }
      />
      <Stepper current={step} complete={complete} maxReachable={maxReachable} onSelect={goTo} />
      {saveError && state === 'error' ? (
        <View style={[styles.offline, { backgroundColor: colors.dangerSoft }]} accessibilityRole="alert">
          <Text variant="caption" tone="danger">
            Not saved yet: {saveError} Your changes are kept on this device.
          </Text>
        </View>
      ) : null}

      <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {Object.keys(liveProblems).length > 0 && attempted[step] ? (
          <View style={[styles.banner, { borderColor: colors.danger, backgroundColor: colors.dangerSoft }]} accessibilityRole="alert">
            <Text variant="label" tone="danger">
              A few things need attention
            </Text>
            <Text variant="caption" tone="muted">
              Look for the red messages below.
            </Text>
          </View>
        ) : null}
        {status === 'changes_requested' && step === 0 ? (
          <View style={[styles.banner, { borderColor: colors.warn, backgroundColor: colors.warnSoft }]}>
            <Text variant="label">Changes requested by the reviewer</Text>
            <Text variant="caption" tone="muted">
              Update your campaign and submit it again from the last step.
            </Text>
          </View>
        ) : null}
        {step === 0 ? <StepBasics {...common} /> : null}
        {step === 1 ? <StepStory {...common} /> : null}
        {step === 2 ? <StepVisuals {...common} /> : null}
        {step === 3 ? <StepReach {...common} /> : null}
        {step === 4 ? <StepSubmit {...common} terms={terms} onTerms={setTerms} onGoToStep={goTo} /> : null}
      </ScrollView>

      <View style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.rule }]}>
        <View style={styles.barInner}>
          <Button label="Back" variant="secondary" onPress={back} fullWidth={false} style={styles.small} />
          <Button label="Save draft" variant="ghost" onPress={saveDraft} loading={state === 'saving'} fullWidth={false} style={styles.small} />
          <View style={{ flex: 1 }} />
          {step < 4 ? (
            <Button label="Continue" onPress={next} fullWidth={false} style={styles.cta} />
          ) : (
            <Button label="Submit for review" onPress={submit} loading={submitting} fullWidth={false} style={styles.cta} />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: layout.gutter, paddingBottom: space.x5, width: '100%', maxWidth: layout.maxContent, alignSelf: 'center', gap: space.lg },
  banner: { borderLeftWidth: 3, padding: space.md, gap: 2 },
  offline: { paddingHorizontal: layout.gutter, paddingVertical: space.sm },
  bar: { borderTopWidth: 1 },
  barInner: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: layout.gutter, paddingVertical: space.md, width: '100%', maxWidth: layout.maxContent, alignSelf: 'center' },
  small: { paddingHorizontal: space.lg },
  cta: { paddingHorizontal: space.xl },
});
