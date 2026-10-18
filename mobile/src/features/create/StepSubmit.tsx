import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check, Circle } from 'lucide-react-native';
import { useConfig } from '@/api/hooks';
import { AdPreview } from '@/components/campaign/AdPreview';
import { CoverArt } from '@/components/campaign/CoverArt';
import { StoryRenderer } from '@/components/campaign/StoryRenderer';
import { Button, Field, Sheet, StatusChip, Text } from '@/components/ui';
import { money, number } from '@/lib/format';
import { space, useTheme } from '@/theme';
import { CheckRow } from './CheckRow';
import { validateStep, wordCount, type DraftForm, type Problems, type StepIndex } from './form';

type Props = {
  form: DraftForm;
  update: (p: Partial<DraftForm>) => void;
  problems: Problems;
  terms: boolean;
  onTerms: (v: boolean) => void;
  onGoToStep: (s: StepIndex) => void;
};

type Item = { label: string; ok: boolean; required: boolean; step: StepIndex };

export function StepSubmit({ form, update, problems, terms, onTerms, onGoToStep }: Props) {
  const { colors } = useTheme();
  const cfg = useConfig();
  const [pagePreview, setPagePreview] = useState(false);
  const [adPreview, setAdPreview] = useState(false);
  const [goalText, setGoalText] = useState(form.goalAmount ? String(form.goalAmount) : '');

  // First visit: draft the three summary blocks from what the creator already wrote. They stay editable.
  useEffect(() => {
    const s = form.storySummary;
    if (!s.about && !s.whoFor && !s.whyMatters) {
      update({ storySummary: { ...s, about: form.shortDescription, whoFor: form.targetAudience, whyMatters: form.whyItMatters } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goal = form.goalAmount ?? 0;
  const words = wordCount(form.story);
  const stepOk = (s: StepIndex) => Object.keys(validateStep(s, form, cfg.minGoal, true)).length === 0 || s === 4;
  const checklist: Item[] = [
    { label: 'Title, category and who is behind it', ok: Object.keys(validateStep(0, form, cfg.minGoal)).length === 0, required: true, step: 0 },
    { label: 'Short description and story', ok: Object.keys(validateStep(1, form, cfg.minGoal)).length === 0, required: true, step: 1 },
    { label: 'Cover image added', ok: Boolean(form.cover.url || form.cover.generated), required: true, step: 2 },
    { label: 'Image rights confirmed', ok: !validateStep(2, form, cfg.minGoal).coverRights && !validateStep(2, form, cfg.minGoal).adImageRights, required: true, step: 2 },
    { label: 'Audience and ad platform chosen', ok: stepOk(3), required: true, step: 3 },
    { label: `Funding goal of at least $${cfg.minGoal}`, ok: goal >= cfg.minGoal, required: true, step: 4 },
    { label: `Story is at least 80 words (${words} now)`, ok: words >= 80, required: false, step: 1 },
    { label: 'At least one source listed', ok: form.sources.some((s) => s.url.trim()), required: false, step: 1 },
  ];

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: 4 }}>
        <Text variant="title">Review and submit</Text>
        <Text variant="bodySm" tone="muted">
          A reviewer checks your campaign before it reaches the feed. Nothing is published from this screen until you submit.
        </Text>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="label">Preview before you submit</Text>
        <Button label="Preview campaign page" variant="secondary" onPress={() => setPagePreview(true)} />
        <Button label="Preview the ad" variant="secondary" onPress={() => setAdPreview(true)} />
      </View>

      <View style={{ gap: space.md }}>
        <View style={{ gap: 2 }}>
          <Text variant="heading">The story, in summary</Text>
          <Text variant="caption" tone="muted">
            Drafted from what you wrote. Edit anything that does not sound like you. Readers see this block first.
          </Text>
        </View>
        <Field label="What this is about" value={form.storySummary.about} onChangeText={(t) => update({ storySummary: { ...form.storySummary, about: t } })} multiline minHeight={80} maxLength={600} />
        <Field label="Who it is for" value={form.storySummary.whoFor} onChangeText={(t) => update({ storySummary: { ...form.storySummary, whoFor: t } })} multiline minHeight={80} maxLength={600} />
        <Field label="Why it matters to them" value={form.storySummary.whyMatters} onChangeText={(t) => update({ storySummary: { ...form.storySummary, whyMatters: t } })} multiline minHeight={80} maxLength={600} />
        <CheckRow
          checked={form.storySummary.sameForBackers}
          onChange={(v) => update({ storySummary: { ...form.storySummary, sameForBackers: v } })}
          label="“Why it matters” reads the same for backers and the audience. Turn off to write a separate version for backers."
        />
      </View>

      <View style={{ gap: space.md }}>
        <View style={{ gap: 2 }}>
          <Text variant="heading">Funding goal</Text>
          <Text variant="caption" tone="muted">
            You set this, and only you. It is never filled in for you. Reviewers may confirm the final amount based on reach and impact.
          </Text>
        </View>
        <Field
          label="How much do you want to raise?"
          required
          value={goalText}
          onChangeText={(t) => {
            const cleaned = t.replace(/[^0-9]/g, '').slice(0, 7);
            setGoalText(cleaned);
            update({ goalAmount: cleaned ? Number(cleaned) : null });
          }}
          keyboardType="number-pad"
          error={problems.goalAmount}
          hint={`$${cfg.minGoal} minimum. Raised money pays for ads; unspent amounts are returned to backers.`}
          placeholder="e.g. 5000"
        />
        <View style={[styles.reach, { borderColor: colors.ink }]}>
          <Text variant="numberLg" tone="action">
            ≈ {goal >= cfg.minGoal ? number(Math.round(goal * cfg.reachPerDollar)) : '—'}
          </Text>
          <View style={{ flex: 1 }}>
            <Text variant="label">people at your goal</Text>
            <Text variant="caption" tone="muted">
              Estimate only: about {cfg.reachPerDollar} people per $1 at the platform rate. Real delivery varies with audience and ad prices.
            </Text>
          </View>
        </View>
        <Text variant="caption" tone="muted">
          Fees: a {Math.round(cfg.platformFeeRate * 100)}% platform fee applies when a campaign raises money. Backers also pay card processing fees on top.
        </Text>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="heading">Before you submit</Text>
        {checklist.map((c) => (
          <View key={c.label} style={styles.item}>
            {c.ok ? <Check size={18} color={colors.positive} strokeWidth={2.5} /> : <Circle size={18} color={c.required ? colors.danger : colors.inkMuted} strokeWidth={1.75} />}
            <Text variant="bodySm" style={{ flex: 1 }}>
              {c.label}
            </Text>
            {!c.ok ? (
              <>
                <StatusChip label={c.required ? 'Required' : 'Suggested'} tone={c.required ? 'danger' : 'warn'} />
                <Pressable onPress={() => onGoToStep(c.step)} accessibilityRole="button" hitSlop={8}>
                  <Text variant="label" tone="action">
                    Fix
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        ))}
      </View>

      <CheckRow
        checked={terms}
        onChange={onTerms}
        label="Every claim here is one I can stand behind, and I accept the campaign terms. Editing an approved campaign sends it back for review."
        error={problems.terms}
      />

      <View style={[styles.next, { borderColor: colors.rule }]}>
        <Text variant="label">What happens next</Text>
        <Text variant="bodySm" tone="muted">
          Review usually takes about {cfg.reviewHours} hours. You will get notes from the reviewer and a chance to revise before anything goes live. Funding goal reached does not start ads by itself.
        </Text>
      </View>

      <Sheet visible={pagePreview} title="Campaign page preview" onClose={() => setPagePreview(false)}>
        <View style={[styles.banner, { backgroundColor: colors.warnSoft, borderColor: colors.warn }]}>
          <Text variant="kicker" tone="warn">
            Preview — not published
          </Text>
        </View>
        <CoverArt seed={form.title || 'new'} category={form.category || 'Other'} cover={form.cover} ratio={16 / 10} label={false} />
        <Text variant="kicker" tone="action">
          {form.category || 'Category'}
        </Text>
        <Text variant="title">{form.title || 'Your title'}</Text>
        <Text variant="subheading" tone="muted">
          {form.shortDescription || 'Your short description'}
        </Text>
        <Text variant="caption" tone="muted">
          by {form.creatorName || 'Creator'}
        </Text>
        <View style={[styles.reach, { borderColor: colors.ink }]}>
          <Text variant="number">{goal ? money(goal) : '—'}</Text>
          <Text variant="caption" tone="muted">
            goal · {form.fundingWindow === 'evergreen' ? 'no deadline' : `${form.fundingWindow} days`}
          </Text>
        </View>
        <StoryRenderer blocks={form.story} />
        {form.sources.filter((s) => s.url.trim()).length ? (
          <View style={{ gap: 6 }}>
            <Text variant="label">Sources</Text>
            {form.sources
              .filter((s) => s.url.trim())
              .map((s, i) => (
                <Text key={s.id} variant="bodySm" tone="muted">
                  {i + 1}. {s.title || s.url}
                </Text>
              ))}
          </View>
        ) : null}
      </Sheet>

      <Sheet visible={adPreview} title="Ad preview" onClose={() => setAdPreview(false)}>
        <View style={[styles.banner, { backgroundColor: colors.warnSoft, borderColor: colors.warn }]}>
          <Text variant="kicker" tone="warn">
            Preview — not published
          </Text>
        </View>
        <AdPreview
          primaryText={form.ad.useOwn ? form.ad.primaryText : form.shortDescription}
          headline={form.ad.useOwn ? form.ad.headline : form.title.slice(0, 40)}
          seed={form.title || 'new'}
          category={form.category || 'Other'}
          cover={form.ad.useOwn && form.ad.image?.url ? form.ad.image : form.cover}
          network={form.platforms.join(', ') || 'Facebook'}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  reach: { flexDirection: 'row', alignItems: 'center', gap: space.lg, borderTopWidth: 2, borderBottomWidth: 1, paddingVertical: space.md },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40 },
  next: { borderTopWidth: 1, paddingTop: space.lg, gap: 4 },
  banner: { borderLeftWidth: 3, padding: space.sm },
});
