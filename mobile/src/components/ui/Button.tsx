import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { fonts, layout, radius, space, useTheme } from '@/theme';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'md' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = true,
  style,
  accessibilityHint,
}: Props) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  const palette = {
    primary: { bg: colors.action, fg: colors.actionInk, border: colors.action },
    dark: { bg: colors.ink, fg: colors.bg, border: colors.ink },
    secondary: { bg: 'transparent', fg: colors.ink, border: colors.ink },
    ghost: { bg: 'transparent', fg: colors.ink, border: 'transparent' },
    danger: { bg: 'transparent', fg: colors.danger, border: colors.danger },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: size === 'md' ? layout.minTouch + 4 : 40,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: inactive ? 0.45 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text
            style={{ color: palette.fg, fontFamily: fonts.sansSemi, fontSize: size === 'md' ? 16 : 14 }}
            numberOfLines={1}
          >
            {label}
          </Text>
          {iconRight}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
