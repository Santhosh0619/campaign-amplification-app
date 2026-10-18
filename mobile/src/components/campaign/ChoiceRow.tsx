import { StyleSheet, View } from 'react-native';
import { Chip, Text } from '@/components/ui';
import { space } from '@/theme';

type Value = 'no' | 'somewhat' | 'yes';
const options: { value: Value; label: string }[] = [
  { value: 'no', label: 'No' },
  { value: 'somewhat', label: 'Somewhat' },
  { value: 'yes', label: 'Yes' },
];

/** A single-question feedback prompt with No / Somewhat / Yes answers. */
export function ChoiceRow({ question, value, onChange, thanks = 'Thanks for the feedback.' }: { question: string; value?: Value; onChange: (v: Value) => void; thanks?: string }) {
  return (
    <View style={styles.wrap}>
      <Text variant="label">{question}</Text>
      <View style={styles.row}>
        {options.map((o) => (
          <Chip key={o.value} label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
        ))}
      </View>
      {value ? (
        <Text variant="caption" tone="positive" accessibilityLiveRegion="polite">
          {thanks}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ wrap: { gap: space.sm }, row: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' } });
