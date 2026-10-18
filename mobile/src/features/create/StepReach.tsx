import { StyleSheet, Switch, View } from 'react-native';
import { useConfig } from '@/api/hooks';
import { EstimateNote } from '@/components/campaign/EstimateNote';
import { Chip, Field, Text } from '@/components/ui';
import { space, useTheme } from '@/theme';
import type { DraftForm, Problems } from './form';

type Props = { form: DraftForm; update: (p: Partial<DraftForm>) => void; problems: Problems };

const platformNotes: Record<string, string> = {
  Facebook: 'Created paused for a person to review and activate.',
  Instagram: 'Feed and Explore. Created paused for review.',
  YouTube: 'Image ads in the feed and Shorts. Created paused for review.',
  Reddit: 'Created paused for a person to review and activate.',
  LinkedIn: 'Created as drafts for review.',
  X: 'Created paused for a person to review and activate.',
  TikTok: 'Created paused for a person to review and activate.',
  Pinterest: 'Created paused for a person to review and activate.',
};

export function StepReach({ form, update, problems }: Props) {
  const { colors } = useTheme();
  const cfg = useConfig();

  const toggle = (name: string) =>
    update({ platforms: form.platforms.includes(name) ? form.platforms.filter((p) => p !== name) : [...form.platforms, name] });

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: 4 }}>
        <Text variant="title">Who should this reach?</Text>
        <Text variant="bodySm" tone="muted">
          Tell us who the message is for and where it should run. You choose the intent. Reviewers finalise the exact targeting.
        </Text>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="label">Funding window</Text>
        <View style={styles.wrap}>
          {cfg.fundingWindows.map((w) => (
            <Chip key={String(w)} label={w === 'evergreen' ? 'No deadline' : `${w} days`} selected={form.fundingWindow === w} onPress={() => update({ fundingWindow: w })} />
          ))}
        </View>
        <Text variant="caption" tone="muted">
          Starts the day your campaign is approved.
        </Text>
      </View>

      <Field
        label="Who is the target audience?"
        required
        value={form.targetAudience}
        onChangeText={(t) => update({ targetAudience: t })}
        multiline
        minHeight={96}
        maxLength={600}
        error={problems.targetAudience}
        hint="Describe them in your own words, e.g. “Parents in the north districts”. Targeting uses broad location and interests only, never personal data."
      />

      <Field
        label="Why would it matter to them?"
        value={form.whyItMatters}
        onChangeText={(t) => update({ whyItMatters: t })}
        multiline
        minHeight={84}
        maxLength={600}
        hint="Write it for someone who has never heard of your cause."
      />

      <View style={{ gap: space.md }}>
        <View style={{ gap: 2 }}>
          <Text variant="heading">Where should the ad run?</Text>
          <Text variant="caption" tone={problems.platforms ? 'danger' : 'muted'}>
            {problems.platforms ?? 'Pick the networks to promote on. Ads are created paused until a person activates them.'}
          </Text>
        </View>
        {cfg.adPlatforms.map((p) => (
          <View key={p} style={[styles.platform, { borderColor: form.platforms.includes(p) ? colors.ink : colors.rule, backgroundColor: colors.surface }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label">{p}</Text>
              <Text variant="caption" tone="muted">
                {platformNotes[p] ?? ''}
              </Text>
            </View>
            <Switch value={form.platforms.includes(p)} onValueChange={() => toggle(p)} trackColor={{ true: colors.positive, false: colors.rule }} thumbColor="#FFFFFF" accessibilityLabel={p} />
          </View>
        ))}
      </View>

      <View style={[styles.preview, { borderColor: colors.ink }]}>
        <Text variant="kicker" tone="muted">
          Audience preview
        </Text>
        <Text variant="heading">{form.targetAudience.trim() || 'Your audience appears here'}</Text>
        <Text variant="bodySm" tone="muted">
          {form.platforms.length ? `Shown in ${form.platforms.join(', ')} as a sponsored post.` : 'Choose at least one network.'}
        </Text>
        <View style={[styles.split, { borderColor: colors.rule }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="kicker" tone="positive">
              You choose
            </Text>
            <Text variant="caption" tone="muted">
              Funding window, audience description, networks
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="kicker" tone="warn">
              Finalised in review
            </Text>
            <Text variant="caption" tone="muted">
              Exact targeting, budget split, schedule
            </Text>
          </View>
        </View>
        <EstimateNote>{`Estimate: about ${cfg.reachPerDollar} people per $1. Actual reach is never guaranteed.`}</EstimateNote>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  platform: { flexDirection: 'row', alignItems: 'center', gap: space.lg, borderWidth: 1.5, padding: space.md, minHeight: 64 },
  preview: { borderTopWidth: 2, paddingTop: space.md, gap: space.sm },
  split: { flexDirection: 'row', gap: space.lg, borderTopWidth: 1, paddingTop: space.md, marginTop: space.sm },
});
