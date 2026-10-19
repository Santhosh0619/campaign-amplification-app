import { Pressable, StyleSheet } from 'react-native';
import { Moon, Sun } from 'lucide-react-native';
import { useThemeMode } from '@/store/theme';
import { useTheme } from '@/theme';

/** One-tap light/dark switch for screen headers. */
export function ThemeToggle() {
  const { colors, scheme } = useTheme();
  const setMode = useThemeMode((s) => s.setMode);
  const Icon = scheme === 'dark' ? Sun : Moon;
  return (
    <Pressable
      onPress={() => setMode(scheme === 'dark' ? 'light' : 'dark')}
      accessibilityRole="button"
      accessibilityLabel={scheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      hitSlop={6}
      style={[styles.btn, { borderColor: colors.rule, backgroundColor: colors.surface }]}
    >
      <Icon size={19} color={colors.ink} strokeWidth={1.75} />
    </Pressable>
  );
}

const styles = StyleSheet.create({ btn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' } });
