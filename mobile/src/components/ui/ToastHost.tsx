import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/store/toast';
import { radius, space, useTheme } from '@/theme';
import { Text } from './Text';

/** One message at a time, above the tab bar. Announced to screen readers as a live region. */
export function ToastHost() {
  const { colors } = useTheme();
  const { message, tone } = useToast();
  if (!message) return null;
  const bg = tone === 'error' ? colors.danger : tone === 'success' ? colors.positive : colors.ink;
  return (
    <SafeAreaView edges={['bottom']} pointerEvents="none" style={styles.host}>
      <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={[styles.toast, { backgroundColor: bg }]}>
        <Text variant="bodySm" style={{ color: tone === 'error' || tone === 'success' ? '#FFFFFF' : colors.bg }}>
          {message}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, bottom: 84, alignItems: 'center', paddingHorizontal: space.xl },
  toast: { maxWidth: 520, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.md },
});
