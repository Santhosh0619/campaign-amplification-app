import { StyleSheet, View } from 'react-native';
import { StatusChip, Text } from '@/components/ui';
import { space, useTheme } from '@/theme';
import type { TrustReview } from '@/types/api';

const rows = [
  { key: 'factCheck', title: 'Fact-checking', hint: 'Are the main claims backed by the listed sources?' },
  { key: 'communication', title: 'Communication integrity', hint: 'Is the message fair, balanced and clear?' },
  { key: 'sharedReality', title: 'Shared reality', hint: 'Could people who disagree still read this together?' },
] as const;

export function TrustBlock({ trust }: { trust: TrustReview }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: space.lg }}>
      <View style={[styles.top, { borderColor: colors.ink }]}>
        <View>
          <Text variant="numberLg">{trust.score}</Text>
          <Text variant="label">{trust.label}</Text>
        </View>
      </View>
      <Text variant="bodySm" tone="muted">
        A reviewer’s score of how well the campaign is sourced and presented. It is not a guarantee of accuracy.
      </Text>
      {rows.map((r) => {
        const item = trust[r.key];
        return (
          <View key={r.key} style={[styles.row, { borderColor: colors.rule }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label">{r.title}</Text>
              <Text variant="caption" tone="muted">
                {item.score === null ? 'Not scored yet' : item.note}
              </Text>
            </View>
            <Text variant="number" tone={item.score === null ? 'muted' : 'ink'}>
              {item.score === null ? '—' : item.score}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderTopWidth: 2, paddingTop: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderTopWidth: 1, paddingTop: space.md },
});
