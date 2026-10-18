import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { space, useTheme } from '@/theme';

const steps = [
  { title: 'Create', body: 'A creator writes the message, lists the sources behind it and chooses who it should reach.' },
  { title: 'Review', body: 'The platform checks the claims against the sources before anything is published or advertised.' },
  { title: 'Amplify', body: 'Backers chip in a few dollars each. Together it pays for ads that carry the message to new people.' },
];

export function HowItWorks() {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {steps.map((s, i) => (
        <View key={s.title} style={[styles.row, { borderTopColor: colors.rule }]}>
          <Text variant="numberLg" tone="action" style={styles.num}>
            {i + 1}
          </Text>
          <View style={styles.text}>
            <Text variant="heading">{s.title}</Text>
            <Text variant="bodySm" tone="muted">
              {s.body}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  row: { flexDirection: 'row', gap: space.lg, paddingVertical: space.lg, borderTopWidth: 1 },
  num: { width: 34 },
  text: { flex: 1, gap: 4 },
});
