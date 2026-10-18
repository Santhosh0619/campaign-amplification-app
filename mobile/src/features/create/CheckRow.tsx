import { Pressable, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Text } from '@/components/ui';
import { space, useTheme } from '@/theme';

type Props = { checked: boolean; onChange: (v: boolean) => void; label: string; error?: string | null };

export function CheckRow({ checked, onChange, label, error }: Props) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Pressable onPress={() => onChange(!checked)} accessibilityRole="checkbox" accessibilityState={{ checked }} style={styles.row}>
        <View style={[styles.box, { borderColor: error ? colors.danger : colors.ink, backgroundColor: checked ? colors.ink : 'transparent' }]}>
          {checked ? <Check size={16} color={colors.bg} strokeWidth={3} /> : null}
        </View>
        <Text variant="bodySm" style={{ flex: 1 }}>
          {label}
        </Text>
      </Pressable>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start', minHeight: 44 },
  box: { width: 24, height: 24, borderWidth: 2, borderRadius: 4, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
