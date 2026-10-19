import { Pressable, StyleSheet, View } from 'react-native';
import { Monitor, Moon, Sun } from 'lucide-react-native';
import { useThemeMode, type ThemeMode } from '@/store/theme';
import { space, useTheme } from '@/theme';
import { Text } from './Text';

const options: { value: ThemeMode; label: string; Icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
  { value: 'system', label: 'Auto', Icon: Monitor },
];

/** Three-way appearance picker for the profile screen. */
export function ThemeSwitch() {
  const { colors } = useTheme();
  const mode = useThemeMode((s) => s.mode);
  const setMode = useThemeMode((s) => s.setMode);
  return (
    <View style={{ gap: space.sm }}>
      <Text variant="kicker" tone="muted">
        Appearance
      </Text>
      <View style={[styles.row, { borderColor: colors.ink }]}>
        {options.map(({ value, label, Icon }) => {
          const on = mode === value;
          return (
            <Pressable
              key={value}
              onPress={() => setMode(value)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label} theme`}
              style={[styles.item, { backgroundColor: on ? colors.ink : 'transparent' }]}
            >
              <Icon size={17} color={on ? colors.bg : colors.ink} strokeWidth={1.75} />
              <Text variant="label" style={{ color: on ? colors.bg : colors.ink }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderWidth: 1.5, borderRadius: 6, overflow: 'hidden' },
  item: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});
