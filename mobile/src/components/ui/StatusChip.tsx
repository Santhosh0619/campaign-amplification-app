import { StyleSheet, View } from 'react-native';
import { radius, space, useTheme } from '@/theme';
import { Text } from './Text';

export type StatusTone = 'neutral' | 'action' | 'positive' | 'warn' | 'danger';

export function StatusChip({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  const { colors } = useTheme();
  const map = {
    neutral: { bg: colors.surfaceAlt, fg: colors.ink },
    action: { bg: colors.actionSoft, fg: colors.action },
    positive: { bg: colors.positiveSoft, fg: colors.positive },
    warn: { bg: colors.warnSoft, fg: colors.warn },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  }[tone];
  return (
    <View style={[styles.chip, { backgroundColor: map.bg }]}>
      <Text variant="kicker" style={{ color: map.fg }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { alignSelf: 'flex-start', paddingHorizontal: space.sm + 2, paddingVertical: 4, borderRadius: radius.sm },
});
