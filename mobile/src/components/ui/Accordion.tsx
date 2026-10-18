import { useState, type ReactNode } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, UIManager, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { space, useTheme } from '@/theme';
import { Text } from './Text';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = { title: string; meta?: string; defaultOpen?: boolean; children: ReactNode };

export function Accordion({ title, meta, defaultOpen = false, children }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
    setOpen((v) => !v);
  };

  return (
    <View style={[styles.wrap, { borderColor: colors.rule }]}>
      <Pressable onPress={toggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.header}>
        <Text variant="heading" style={styles.title}>
          {title}
        </Text>
        {meta ? (
          <Text variant="caption" tone="muted">
            {meta}
          </Text>
        ) : null}
        <ChevronDown size={20} color={colors.ink} strokeWidth={1.5} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderTopWidth: 1 },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  title: { flex: 1, fontSize: 18, lineHeight: 23 },
  body: { paddingBottom: space.xl, gap: space.md },
});
