import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ProgressBar, Text } from '@/components/ui';
import { daysLeftLabel, money, statusLabel } from '@/lib/format';
import { layout, space, useTheme } from '@/theme';
import type { CampaignDetail } from '@/types/api';

type Props = { campaign: CampaignDetail; onBack: () => void };

/** Sticky funding summary. Always visible so the next action is obvious, never covering the story. */
export function FundingBar({ campaign: c, onBack }: Props) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={['bottom']} style={[styles.bar, { backgroundColor: colors.surface, borderTopColor: colors.ink }]}>
      <View style={styles.inner}>
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
            <Text variant="number">{money(c.raisedAmount)}</Text>
            <Text variant="caption" tone="muted">
              of {money(c.goalAmount)} · {c.percentFunded}%
            </Text>
          </View>
          <ProgressBar value={c.percentFunded / 100} height={5} />
          <Text variant="caption" tone="muted">
            {c.canBack ? daysLeftLabel(c.daysLeft, c.status) : statusLabel(c.status)}
          </Text>
        </View>
        {c.canBack ? (
          <Button label="Back this campaign" onPress={onBack} fullWidth={false} style={{ paddingHorizontal: space.lg }} />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: 2 },
  inner: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingHorizontal: layout.gutter, paddingVertical: space.md, width: '100%', maxWidth: layout.maxContent, alignSelf: 'center' },
});
