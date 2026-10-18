import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { useConfig } from '@/api/hooks';
import { Button, Field, Sheet, Text } from '@/components/ui';
import { toast } from '@/store/toast';
import { space, useTheme } from '@/theme';
import type { Cover, StoryBlock } from '@/types/api';
import { CategoryPicker } from './CategoryPicker';
import { CheckRow } from './CheckRow';
import type { DraftForm, Problems } from './form';

type Props = { form: DraftForm; update: (p: Partial<DraftForm>) => void; problems: Problems };

type AiResponse = {
  demo: boolean;
  draft: {
    title: string;
    category: string;
    shortDescription: string;
    story: StoryBlock[];
    whyBackersCare: string;
    targetAudience: string;
    whyItMatters: string;
    storySummary: DraftForm['storySummary'];
  };
  cover: Cover | null;
};

export function StepBasics({ form, update, problems }: Props) {
  const { colors } = useTheme();
  const cfg = useConfig();
  const [prompt, setPrompt] = useState('');
  const [withCover, setWithCover] = useState(false);
  const [confirm, setConfirm] = useState<AiResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const hasContent = Boolean(form.title.trim() || form.story.length || form.shortDescription.trim());

  const apply = (r: AiResponse) => {
    // The funding goal, sources and the creator's name are never touched by drafting.
    update({
      title: r.draft.title,
      category: r.draft.category,
      shortDescription: r.draft.shortDescription,
      story: r.draft.story,
      whyBackersCare: r.draft.whyBackersCare,
      targetAudience: r.draft.targetAudience,
      whyItMatters: r.draft.whyItMatters,
      storySummary: r.draft.storySummary,
      ...(r.cover ? { cover: r.cover } : {}),
    });
    setConfirm(null);
    toast.success('Draft filled in. Edit anything you like.');
  };

  const draft = useMutation({
    mutationFn: () => api<AiResponse>('/ai/draft', { method: 'POST', body: { prompt, withCover } }),
    onSuccess: (r) => {
      setAiError(null);
      if (hasContent) setConfirm(r);
      else apply(r);
    },
    onError: (e) => setAiError(errorMessage(e)),
  });

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: 4 }}>
        <Text variant="title">What is your campaign about?</Text>
        <Text variant="bodySm" tone="muted">
          Start with the basics. You can change everything later, and your work saves as you go.
        </Text>
      </View>

      <View style={[styles.ai, { borderColor: colors.ink, backgroundColor: colors.surface }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text variant="kicker" tone="action">
            Draft it for me
          </Text>
          <Text variant="kicker" tone="muted">
            Demo AI
          </Text>
        </View>
        <Text variant="bodySm" tone="muted">
          Describe your campaign in a few sentences and we will fill the steps. You stay in control and can edit or delete anything. Your funding goal stays yours to set on the last step.
        </Text>
        <Field
          label="Describe your campaign"
          value={prompt}
          onChangeText={(t) => {
            setPrompt(t);
            setAiError(null);
          }}
          multiline
          minHeight={110}
          maxLength={3000}
          error={aiError}
          placeholder="What is happening, who it affects, why it matters and what should change."
        />
        <CheckRow checked={withCover} onChange={setWithCover} label="Also generate a cover image" />
        <Button label="Generate my draft" variant="dark" size="sm" onPress={() => draft.mutate()} loading={draft.isPending} disabled={prompt.trim().length < 40} fullWidth={false} />
      </View>

      <Field
        label="Campaign title"
        required
        value={form.title}
        onChangeText={(t) => update({ title: t })}
        maxLength={60}
        showCounter
        error={problems.title}
        hint="60 characters or less. The first 40 are used as the ad headline unless you write a custom one."
        placeholder="e.g. Plant the shade where the heat is"
      />
      <CategoryPicker value={form.category} options={cfg.categories} onChange={(v) => update({ category: v })} error={problems.category} />
      <Field
        label="Who is behind this campaign?"
        required
        value={form.creatorName}
        onChangeText={(t) => update({ creatorName: t })}
        maxLength={80}
        error={problems.creatorName}
        hint="Shown as “by” on the published page. Use your name or your organisation."
        placeholder="e.g. Riverside Mutual Aid"
      />

      <Sheet visible={Boolean(confirm)} title="Replace your draft?" onClose={() => setConfirm(null)}>
        <Text variant="body">This will replace your title, summary and story with the new draft. Your sources, ad settings and funding goal stay as they are.</Text>
        <Button label="Replace with new draft" onPress={() => confirm && apply(confirm)} />
        <Button label="Keep what I have" variant="ghost" onPress={() => setConfirm(null)} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({ ai: { borderTopWidth: 2, borderWidth: 1, padding: space.lg, gap: space.md } });
