import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { layout, space, useTheme } from '@/theme';
import { Text } from './Text';

type Props = { title?: string; onBack?: () => void; right?: ReactNode; hideBack?: boolean };

export function ScreenHeader({ title, onBack, right, hideBack }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const back = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  return (
    <View style={[styles.row, { paddingHorizontal: layout.gutter }]}>
      {hideBack ? (
        <View style={styles.slot} />
      ) : (
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} style={styles.slot}>
          <ArrowLeft size={24} color={colors.ink} strokeWidth={1.5} />
        </Pressable>
      )}
      <Text variant="label" style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={[styles.slot, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, gap: space.sm },
  slot: { width: 48, height: 48, justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center' },
});
