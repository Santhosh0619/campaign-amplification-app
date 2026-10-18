import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useConfig } from '@/api/hooks';
import { EstimateNote } from '@/components/campaign/EstimateNote';
import { Button, Chip, Field, Text } from '@/components/ui';
import { space, useTheme } from '@/theme';
import { budgetTotal, evenSplit, type DraftForm, type Problems } from './form';
import { TagPicker } from './TagPicker';

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

const placeSuggestions = ['United States', 'United Kingdom', 'India', 'Canada', 'Australia', 'European Union'];
const interestSuggestions = ['Civic life', 'Health', 'Education', 'Environment', 'Technology', 'Small business', 'Parenting', 'Local news'];

export function StepReach({ form, update, problems }: Props) {
  const { colors } = useTheme();
  const cfg = useConfig();

  const setPlatforms = (platforms: string[]) => update({ platforms, reach: { ...form.reach, budget: evenSplit(platforms) } });
  const toggle = (name: string) => setPlatforms(form.platforms.includes(name) ? form.platforms.filter((p) => p !== name) : [...form.platforms, name]);

  const total = budgetTotal(form);
  const nudge = (name: string, delta: number) => {
    const next = Math.max(0, Math.min(100, (form.reach.budget[name] ?? 0) + delta));
    update({ reach: { ...form.reach, budget: { ...form.reach.budget, [name]: next } } });
  };

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
        hint="Describe them in your own words, e.g. “Parents in the north districts”."
      />

      <TagPicker
        label="Where should it be shown?"
        value={form.reach.locations}
        suggestions={placeSuggestions}
        onChange={(locations) => update({ reach: { ...form.reach, locations } })}
        placeholder="Add a country, region or city"
        hint="Broad locations only. Exact targeting is set in review."
      />

      <TagPicker
        label="Interests and characteristics"
        value={form.reach.interests}
        suggestions={interestSuggestions}
        onChange={(interests) => update({ reach: { ...form.reach, interests } })}
        placeholder="Add an interest"
        hint="Used only where the network supports it. Never personal data about individuals."
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

      {form.platforms.length > 1 ? (
        <View style={{ gap: space.md }}>
          <View style={{ gap: 2 }}>
            <Text variant="heading">Budget allocation</Text>
            <Text variant="caption" tone="muted">
              How the ad budget is split across your networks. Reviewers may adjust this based on delivery.
            </Text>
          </View>
          {form.platforms.map((p) => (
            <View key={p} style={[styles.budgetRow, { borderColor: colors.rule }]}>
              <Text variant="label" style={{ flex: 1 }}>
                {p}
              </Text>
              <Stepper label={`Decrease ${p}`} onPress={() => nudge(p, -5)} disabled={(form.reach.budget[p] ?? 0) <= 0}>
                <Minus size={18} color={colors.ink} strokeWidth={2} />
              </Stepper>
              <Text variant="number" style={{ width: 64, textAlign: 'center' }}>
                {form.reach.budget[p] ?? 0}%
              </Text>
              <Stepper label={`Increase ${p}`} onPress={() => nudge(p, 5)} disabled={(form.reach.budget[p] ?? 0) >= 100}>
                <Plus size={18} color={colors.ink} strokeWidth={2} />
              </Stepper>
            </View>
          ))}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="label" tone={total === 100 ? 'positive' : 'danger'} accessibilityLiveRegion="polite">
              Total {total}% {total === 100 ? '' : '— must be 100%'}
            </Text>
            <Button label="Split evenly" variant="ghost" size="sm" onPress={() => setPlatforms(form.platforms)} fullWidth={false} />
          </View>
          {problems.budget ? (
            <Text variant="caption" tone="danger">
              {problems.budget}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.preview, { borderColor: colors.ink }]}>
        <Text variant="kicker" tone="muted">
          Audience preview
        </Text>
        <Text variant="heading">{form.targetAudience.trim() || 'Your audience appears here'}</Text>
        <Text variant="bodySm" tone="muted">
          {[form.reach.locations.length ? `In ${form.reach.locations.join(', ')}` : null, form.reach.interests.length ? `interested in ${form.reach.interests.join(', ')}` : null]
            .filter(Boolean)
            .join(', ') || 'Add places and interests to describe who sees it.'}
        </Text>
        <Text variant="bodySm" tone="muted">
          {form.platforms.length ? `Shown in ${form.platforms.join(', ')} as a sponsored post.` : 'Choose at least one network.'}
        </Text>
        <View style={[styles.split, { borderColor: colors.rule }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="kicker" tone="positive">
              You choose
            </Text>
            <Text variant="caption" tone="muted">
              Window, audience, places, interests, networks, budget split
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="kicker" tone="warn">
              Finalised in review
            </Text>
            <Text variant="caption" tone="muted">
              Exact targeting, final goal, schedule
            </Text>
          </View>
        </View>
        <EstimateNote>{`Estimate: about ${cfg.reachPerDollar} people per $1. Actual reach is never guaranteed.`}</EstimateNote>
      </View>
    </View>
  );
}

function Stepper({ children, onPress, label, disabled }: { children: React.ReactNode; onPress: () => void; label: string; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.stepBtn, { borderColor: colors.ink, opacity: disabled ? 0.3 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  platform: { flexDirection: 'row', alignItems: 'center', gap: space.lg, borderWidth: 1.5, padding: space.md, minHeight: 64 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderBottomWidth: 1, minHeight: 56 },
  stepBtn: { width: 44, height: 44, borderWidth: 1.5, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  preview: { borderTopWidth: 2, paddingTop: space.md, gap: space.sm },
  split: { flexDirection: 'row', gap: space.lg, borderTopWidth: 1, paddingTop: space.md, marginTop: space.sm },
});
