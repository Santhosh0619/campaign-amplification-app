import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { Text } from '@/components/ui';
import { fonts, layout, radius, space, useTheme } from '@/theme';
import { STEP_LABELS, type StepIndex } from './form';

type Props = { current: StepIndex; complete: boolean[]; maxReachable: number; onSelect: (i: StepIndex) => void };

/** Persistent five-step indicator. Completed steps are tappable; later steps unlock as earlier ones are valid. */
export function Stepper({ current, complete, maxReachable, onSelect }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { borderColor: colors.rule, backgroundColor: colors.bg }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {STEP_LABELS.map((label, i) => {
          const active = i === current;
          const done = complete[i] && i !== current;
          const locked = i > maxReachable;
          return (
            <Pressable
              key={label}
              disabled={locked}
              onPress={() => onSelect(i as StepIndex)}
              accessibilityRole="tab"
              accessibilityLabel={`Step ${i + 1}, ${label}${done ? ', complete' : locked ? ', finish earlier steps first' : ''}`}
              accessibilityState={{ selected: active, disabled: locked }}
              style={[styles.item, { backgroundColor: active ? colors.ink : 'transparent', borderColor: active ? colors.ink : colors.rule, opacity: locked ? 0.45 : 1 }]}
            >
              <View style={[styles.badge, { backgroundColor: done ? colors.positive : active ? colors.bg : colors.surfaceAlt }]}>
                {done ? (
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <Text style={{ fontFamily: fonts.sansBold, fontSize: 11, color: active ? colors.ink : colors.inkMuted }}>{i + 1}</Text>
                )}
              </View>
              <Text variant="label" style={{ color: active ? colors.bg : colors.ink }}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: 1, paddingVertical: space.sm, width: '100%', maxWidth: layout.maxContent, alignSelf: 'center' },
  row: { paddingHorizontal: layout.gutter, gap: space.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: space.md, borderRadius: radius.pill, borderWidth: 1 },
  badge: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
