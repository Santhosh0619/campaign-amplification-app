import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Plus, X } from 'lucide-react-native';
import { Chip, Text } from '@/components/ui';
import { fonts, radius, space, useTheme } from '@/theme';

type Props = { label: string; hint?: string; value: string[]; suggestions: string[]; onChange: (v: string[]) => void; placeholder?: string; max?: number };

/** Pick from suggestions or type your own. Selected values show as removable tags. */
export function TagPicker({ label, hint, value, suggestions, onChange, placeholder = 'Add your own', max = 12 }: Props) {
  const { colors } = useTheme();
  const [text, setText] = useState('');

  const add = (raw: string) => {
    const v = raw.trim().slice(0, 40);
    if (!v || value.some((x) => x.toLowerCase() === v.toLowerCase()) || value.length >= max) return;
    onChange([...value, v]);
    setText('');
  };
  const remove = (v: string) => onChange(value.filter((x) => x !== v));
  const open = suggestions.filter((s) => !value.includes(s));

  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label">{label}</Text>
      {value.length > 0 ? (
        <View style={styles.wrap}>
          {value.map((v) => (
            <Pressable key={v} onPress={() => remove(v)} accessibilityRole="button" accessibilityLabel={`Remove ${v}`} style={[styles.tag, { backgroundColor: colors.ink }]}>
              <Text variant="label" style={{ color: colors.bg }}>
                {v}
              </Text>
              <X size={14} color={colors.bg} strokeWidth={2} />
            </Pressable>
          ))}
        </View>
      ) : null}
      {open.length > 0 ? (
        <View style={styles.wrap}>
          {open.map((s) => (
            <Chip key={s} label={`+ ${s}`} onPress={() => add(s)} />
          ))}
        </View>
      ) : null}
      <View style={[styles.row, { borderColor: colors.rule, backgroundColor: colors.surface }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => add(text)}
          placeholder={placeholder}
          placeholderTextColor={colors.inkMuted}
          returnKeyType="done"
          accessibilityLabel={`${label}, add your own`}
          style={[styles.input, { color: colors.ink }]}
        />
        <Pressable onPress={() => add(text)} disabled={!text.trim()} accessibilityRole="button" accessibilityLabel="Add" hitSlop={8} style={{ opacity: text.trim() ? 1 : 0.35 }}>
          <Plus size={22} color={colors.ink} strokeWidth={1.75} />
        </Pressable>
      </View>
      {hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: space.md, borderRadius: radius.pill },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.lg, minHeight: 48 },
  input: { flex: 1, fontFamily: fonts.sans, fontSize: 16, minHeight: 44 },
});
