import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ProgressBar, StatusChip, Text } from '@/components/ui';
import { daysLeftLabel, money, number, statusLabel } from '@/lib/format';
import { radius, space, useTheme } from '@/theme';
import type { CampaignCard as Card } from '@/types/api';
import { CoverArt } from './CoverArt';

type Props = { campaign: Card; compact?: boolean };

export function CampaignCard({ campaign: c, compact = false }: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const funding = c.status === 'available_for_funding';
  const open = () => router.push({ pathname: '/campaign/[slug]', params: { slug: c.slug } });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.rule }]}>
      {/* The tappable story area and the Back button are siblings so presses never nest. */}
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${c.title}, by ${c.creatorName}`}
        style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
      >
        <CoverArt seed={c.slug} category={c.category} cover={c.cover} ratio={compact ? 16 / 10 : 4 / 3} radiusSize={0} />
        <View style={styles.body}>
          <View style={styles.titleBlock}>
            <Text variant="heading" numberOfLines={3}>
              {c.title}
            </Text>
            <Text variant="caption" tone="muted">
              by {c.creatorName}
            </Text>
          </View>
          {!compact ? (
            <Text variant="bodySm" tone="muted" numberOfLines={3}>
              {c.shortDescription}
            </Text>
          ) : null}

          <View style={styles.funding}>
            <View style={styles.amountRow}>
              <Text variant="number">{money(c.raisedAmount)}</Text>
              <Text variant="caption" tone="muted">
                of {money(c.goalAmount)}
              </Text>
            </View>
            <ProgressBar value={c.percentFunded / 100} />
            <View style={styles.metaRow}>
              <Text variant="caption" tone="muted">
                {c.percentFunded}% funded
              </Text>
              {funding ? (
                <Text variant="caption" tone="muted">
                  {daysLeftLabel(c.daysLeft, c.status)}
                </Text>
              ) : (
                <StatusChip label={statusLabel(c.status)} tone={c.status === 'completed' ? 'positive' : 'action'} />
              )}
            </View>
            <Text variant="caption" tone="muted">
              ≈ {number(c.estimatedReachAtGoal)} people at goal
            </Text>
          </View>
        </View>
      </Pressable>

      {funding ? (
        <View style={styles.action}>
          <Button
            label="Back this campaign"
            size="sm"
            onPress={() => router.push({ pathname: '/back/[slug]', params: { slug: c.slug } })}
            accessibilityHint={`Opens the contribution flow for ${c.title}`}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  body: { padding: space.lg, gap: space.md },
  action: { paddingHorizontal: space.lg, paddingBottom: space.lg },
  titleBlock: { gap: 2 },
  funding: { gap: space.sm },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
