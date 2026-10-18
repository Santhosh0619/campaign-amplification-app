import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { layout, space, useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
  contentStyle?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  padded?: boolean;
};

export function Screen({ children, scroll = true, edges = ['top'], contentStyle, footer, padded = true }: Props) {
  const { colors } = useTheme();
  const inner = [styles.inner, padded && { paddingHorizontal: layout.gutter }, contentStyle];
  return (
    <SafeAreaView edges={edges} style={[styles.root, { backgroundColor: colors.bg }]}>
      {scroll ? (
        <ScrollView
          style={styles.root}
          contentContainerStyle={[styles.scrollContent, inner]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.root, inner]}>{children}</View>
      )}
      {footer}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingBottom: space.x5 },
  inner: { width: '100%', maxWidth: layout.maxContent, alignSelf: 'center' },
});
