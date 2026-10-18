import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Sheet, Text } from '@/components/ui';
import { fonts, radius, space, useTheme } from '@/theme';

type Props = { value: string; options: string[]; onChange: (v: string) => void; error?: string | null };

export function CategoryPicker({ value, options, onChange, error }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text variant="label">
        Category
        <Text variant="label" tone="action">
          {' *'}
        </Text>
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Category, ${value || 'not chosen'}`}
        style={[styles.field, { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.rule }]}
      >
        <Text variant="body" tone={value ? 'ink' : 'muted'} style={{ flex: 1 }}>
          {value || 'Choose a category'}
        </Text>
        <ChevronDown size={18} color={colors.ink} strokeWidth={1.75} />
      </Pressable>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
      <Sheet visible={open} title="Choose a category" onClose={() => setOpen(false)}>
        {options.map((o) => (
          <Pressable
            key={o}
            onPress={() => {
              onChange(o);
              setOpen(false);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: value === o }}
            style={[styles.option, { borderColor: colors.rule }]}
          >
            <Text variant="body" style={{ fontFamily: value === o ? fonts.sansSemi : fonts.sans }}>
              {o}
            </Text>
            {value === o ? <View style={[styles.dot, { backgroundColor: colors.action }]} /> : null}
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { minHeight: 52, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, borderBottomWidth: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
