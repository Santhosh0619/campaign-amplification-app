import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { X } from 'lucide-react-native';
import { layout, radius, space, useTheme } from '@/theme';
import { Text } from './Text';

type Props = { visible: boolean; title: string; onClose: () => void; children: ReactNode };

export function Sheet({ visible, title, onClose, children }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} accessibilityLabel="Close" />
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
        <View style={styles.header}>
          <Text variant="heading" style={{ flex: 1 }}>
            {title}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <X size={24} color={colors.ink} strokeWidth={1.5} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    maxHeight: '82%',
    width: '100%',
    maxWidth: layout.maxContent,
    alignSelf: 'center',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: space.xl,
  },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: layout.gutter, paddingBottom: space.md },
  body: { paddingHorizontal: layout.gutter, paddingBottom: space.x4, gap: space.md },
});
