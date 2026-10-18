import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { space, useTheme } from '@/theme';
import { Text } from './Text';

type Props = { title: string; subtitle?: string; onPress?: () => void; right?: ReactNode; danger?: boolean; icon?: ReactNode };

/** One tappable line in a settings-style list. 56px minimum so it is easy to hit. */
export function ListRow({ title, subtitle, onPress, right, danger, icon }: Props) {
  const { colors } = useTheme();
  const body = (
    <View style={[styles.row, { borderColor: colors.rule }]}>
      {icon}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" tone={danger ? 'danger' : 'ink'} style={{ fontSize: 16 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <ChevronRight size={20} color={colors.inkMuted} strokeWidth={1.5} /> : null)}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 60, paddingVertical: space.md, borderBottomWidth: 1 },
});
