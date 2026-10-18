import { StyleSheet, View } from 'react-native';
import { useConfig } from '@/api/hooks';
import { Text } from '@/components/ui';
import { money } from '@/lib/format';
import { space, useTheme } from '@/theme';

/** Plain-language use-of-funds explanation. Numbers come from the shared rules, never hard-coded. */
export function UseOfFunds({ goalAmount }: { goalAmount?: number }) {
  const { colors } = useTheme();
  const cfg = useConfig();
  const adPct = Math.round((1 - cfg.platformFeeRate) * 100);
  const feePct = Math.round(cfg.platformFeeRate * 100);

  return (
    <View style={{ gap: space.lg }}>
      <View style={[styles.callout, { borderColor: colors.action, backgroundColor: colors.actionSoft }]}>
        <Text variant="label">This pays for the message to travel, not for the cause itself.</Text>
        <Text variant="bodySm" tone="muted">
          Contributions fund advertising that shows the campaign to new people. They are not donations to the person, group or cause it describes.
        </Text>
      </View>

      <View style={{ gap: space.sm }}>
        <Text variant="label">For every $10 you contribute</Text>
        <View style={[styles.split, { backgroundColor: colors.surfaceAlt }]}>
          <View style={{ flex: adPct, backgroundColor: colors.positive }} />
          <View style={{ flex: feePct, backgroundColor: colors.ink }} />
        </View>
        <View style={styles.legend}>
          <Text variant="caption">
            <Text variant="caption" tone="positive">
              ■{' '}
            </Text>
            {money((10 * adPct) / 100, { cents: true })} buys ads ({adPct}%)
          </Text>
          <Text variant="caption">■ {money((10 * feePct) / 100, { cents: true })} platform fee ({feePct}%)</Text>
        </View>
      </View>

      <Bullet title="Card fees">A card processing fee of about {(cfg.processingRate * 100).toFixed(1)}% + ${cfg.processingFixed.toFixed(2)} is added at checkout. You always see the total before you pay.</Bullet>
      <Bullet title="When ads can start">
        Contributions are used for ads only once the campaign passes {Math.round(cfg.activationThresholdRate * 100)}%
        {goalAmount ? ` (${money(goalAmount * cfg.activationThresholdRate)})` : ''} of its goal and distribution is prepared. Reaching the goal does not start ads by itself.
      </Bullet>
      <Bullet title="Refunds">You can ask for a refund until the campaign’s activation date. After ads start, funds are committed to delivery.</Bullet>
      <Bullet title="Unspent funds">If part of the ad budget cannot be delivered, the unspent amount is returned to backers in proportion to what they gave.</Bullet>
    </View>
  );
}

function Bullet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="label">{title}</Text>
      <Text variant="bodySm" tone="muted">
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  callout: { borderLeftWidth: 3, padding: space.lg, gap: 4 },
  split: { flexDirection: 'row', height: 12, borderRadius: 2, overflow: 'hidden' },
  legend: { gap: 2 },
});
