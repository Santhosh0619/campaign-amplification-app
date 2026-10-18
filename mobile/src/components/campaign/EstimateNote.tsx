import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Info } from 'lucide-react-native';
import { Sheet, Text } from '@/components/ui';
import { useConfig } from '@/api/hooks';
import { useTheme } from '@/theme';

/** Small "estimate" label with an explanation sheet, so reach figures are never read as promises. */
export function EstimateNote({ children, tone = 'muted' }: { children: string; tone?: 'muted' | 'ink' }) {
  const { colors } = useTheme();
  const cfg = useConfig();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="What is an estimate?" style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text variant="caption" tone={tone}>
          {children}
        </Text>
        <Info size={14} color={colors.inkMuted} strokeWidth={1.75} />
      </Pressable>
      <Sheet visible={open} title="About reach estimates" onClose={() => setOpen(false)}>
        <View style={{ gap: 12 }}>
          <Text variant="body">
            We assume about {cfg.reachPerDollar} people see a message for every $1 spent on ads. That number is a planning rate for this prototype, not a promise.
          </Text>
          <Text variant="body">
            Real delivery depends on ad prices, who is targeted, and how people respond. After a campaign ends, the final report separates measured results from estimates.
          </Text>
        </View>
      </Sheet>
    </>
  );
}
