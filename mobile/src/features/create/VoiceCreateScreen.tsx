import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Mic, Square } from 'lucide-react-native';
import { api, errorMessage } from '@/api/client';
import { Button, Field, ProgressBar, Screen, ScreenHeader, Text } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { radius, space, useTheme } from '@/theme';
import type { StoryBlock } from '@/types/api';
import { useSpeech } from './useSpeech';

type Answers = { about: string; audience: string; why: string; evidence: string };

const questions: { key: keyof Answers; title: string; help: string; placeholder: string; required?: boolean }[] = [
  {
    key: 'about',
    title: 'What is your message about?',
    help: 'Say it the way you would explain it to a friend. What is happening, and what should change?',
    placeholder: 'e.g. Bus stops in our hottest districts have no shade, and the tree budget is decided next month.',
    required: true,
  },
  {
    key: 'audience',
    title: 'Who should hear it?',
    help: 'Describe the people you most want to reach.',
    placeholder: 'e.g. Commuters and parents in the north districts, and the voters of the parks committee.',
  },
  {
    key: 'why',
    title: 'Why does it matter?',
    help: 'Why should someone who has never heard of this care?',
    placeholder: 'e.g. Waiting in the sun is a daily health risk, and shade is cheap.',
  },
  {
    key: 'evidence',
    title: 'What evidence supports it?',
    help: 'Mention studies, figures or links. Any web links you give become your listed sources.',
    placeholder: 'e.g. The 2026 thermal survey https://example.org/thermal-survey-2026 found an 11 degree gap.',
  },
];

type DraftResponse = {
  draft: {
    title: string;
    category: string;
    shortDescription: string;
    story: StoryBlock[];
    whyBackersCare: string;
    targetAudience: string;
    whyItMatters: string;
    storySummary: { about: string; whoFor: string; whyMatters: string; sameForBackers: boolean };
    sources: { id: string; title: string; url: string }[];
  };
};

export function VoiceCreateScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ about: '', audience: '', why: '', evidence: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const q = questions[index];
  const last = index === questions.length - 1;
  const speech = useSpeech((t) => setAnswers((a) => ({ ...a, [q.key]: `${a[q.key]}${a[q.key] ? ' ' : ''}${t}` })));

  const go = (next: number) => {
    speech.stop();
    setError(null);
    setIndex(next);
  };

  const build = async () => {
    speech.stop();
    setBusy(true);
    setError(null);
    try {
      const ai = await api<DraftResponse>('/ai/voice-draft', { method: 'POST', body: answers });
      const created = await api<{ campaign: { id: string } }>('/campaigns', { method: 'POST', body: {} });
      const d = ai.draft;
      await api(`/campaigns/${created.campaign.id}`, {
        method: 'PATCH',
        body: {
          title: d.title,
          category: d.category,
          creatorName: user?.name ?? '',
          shortDescription: d.shortDescription,
          story: d.story,
          whyBackersCare: d.whyBackersCare,
          targetAudience: d.targetAudience,
          whyItMatters: d.whyItMatters,
          storySummary: d.storySummary,
          sources: d.sources,
        },
      });
      void qc.invalidateQueries({ queryKey: ['campaigns', 'mine'] });
      toast.success('Your draft is ready. Review and edit anything.');
      router.replace({ pathname: '/create/[id]', params: { id: created.campaign.id } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (q.required && answers[q.key].trim().length < 10) {
      setError('Tell us a little about your message to continue.');
      return;
    }
    if (last) void build();
    else go(index + 1);
  };

  return (
    <Screen>
      <ScreenHeader title="Create with your voice" onBack={() => (index > 0 ? go(index - 1) : router.back())} />
      <View style={{ gap: space.xl }}>
        <View style={{ gap: space.sm }}>
          <Text variant="kicker" tone="muted">
            Question {index + 1} of {questions.length} · Demo AI
          </Text>
          <ProgressBar value={(index + 1) / questions.length} tone="action" />
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="display" style={{ fontSize: 30, lineHeight: 34 }}>
            {q.title}
          </Text>
          <Text variant="body" tone="muted">
            {q.help}
          </Text>
        </View>

        {speech.supported ? (
          <Pressable
            onPress={speech.listening ? speech.stop : speech.start}
            accessibilityRole="button"
            accessibilityLabel={speech.listening ? 'Stop recording' : 'Start speaking'}
            style={[styles.mic, { backgroundColor: speech.listening ? colors.danger : colors.action }]}
          >
            {speech.listening ? <Square size={24} color="#FFFFFF" fill="#FFFFFF" /> : <Mic size={26} color={colors.actionInk} strokeWidth={2} />}
            <Text variant="label" style={{ color: speech.listening ? '#FFFFFF' : colors.actionInk }}>
              {speech.listening ? 'Listening… tap to stop' : 'Tap and speak'}
            </Text>
          </Pressable>
        ) : (
          <View style={[styles.hint, { borderColor: colors.rule }]}>
            <Mic size={20} color={colors.inkMuted} strokeWidth={1.75} />
            <Text variant="bodySm" tone="muted" style={{ flex: 1 }}>
              Speech recognition is not available on this phone. Type your answer below, or use the microphone on your keyboard.
            </Text>
          </View>
        )}
        {speech.listening && speech.interim ? (
          <Text variant="bodySm" tone="muted" style={{ fontStyle: 'italic' }}>
            {speech.interim}�
          </Text>
        ) : null}
        {speech.error ? (
          <Text variant="caption" tone="danger">
            {speech.error}
          </Text>
        ) : null}

        <Field
          label="Your answer"
          value={answers[q.key]}
          onChangeText={(t) => {
            setAnswers((a) => ({ ...a, [q.key]: t }));
            setError(null);
          }}
          multiline
          minHeight={150}
          maxLength={1500}
          placeholder={q.placeholder}
          error={error}
        />

        <Text variant="caption" tone="muted">
          You can edit, correct or delete everything on the next screens. Nothing is published or submitted from here.
        </Text>

        <View style={{ gap: space.sm }}>
          <Button label={last ? 'Build my draft' : 'Next question'} onPress={next} loading={busy} />
          {!q.required && !last ? <Button label="Skip this question" variant="ghost" onPress={() => go(index + 1)} /> : null}
          <Button label="Write it myself instead" variant="ghost" onPress={() => router.replace('/create')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mic: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md, minHeight: 64, borderRadius: radius.md },
  hint: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: space.md },
});
