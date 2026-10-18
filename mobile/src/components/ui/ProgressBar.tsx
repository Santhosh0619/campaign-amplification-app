import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { radius, useTheme } from '@/theme';

type Props = { value: number; height?: number; tone?: 'positive' | 'action' };

export function ProgressBar({ value, height = 6, tone = 'positive' }: Props) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(1, value));
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: clamped, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [anim, clamped]);

  const width = anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, backgroundColor: colors.surfaceAlt }]}
    >
      <Animated.View
        style={{ width, height, borderRadius: radius.pill, backgroundColor: tone === 'positive' ? colors.positive : colors.action }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ track: { borderRadius: radius.pill, overflow: 'hidden' } });
