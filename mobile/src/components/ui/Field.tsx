import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { fonts, radius, space, useTheme } from '@/theme';
import { Text } from './Text';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  maxLength?: number;
  showCounter?: boolean;
  minHeight?: number;
};

export function Field({ label, required, hint, error, maxLength, showCounter, minHeight, multiline, value, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const length = typeof value === 'string' ? value.length : 0;
  const borderColor = error ? colors.danger : focused ? colors.ink : colors.rule;

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text variant="label">
          {label}
          {required ? (
            <Text variant="label" tone="action">
              {' *'}
            </Text>
          ) : null}
        </Text>
        {showCounter && maxLength ? (
          <Text variant="caption" tone={length > maxLength ? 'danger' : 'muted'}>
            {length}/{maxLength}
          </Text>
        ) : null}
      </View>
      <TextInput
        {...rest}
        value={value}
        multiline={multiline}
        accessibilityLabel={label}
        placeholderTextColor={colors.inkMuted}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        style={[
          styles.input,
          {
            color: colors.ink,
            backgroundColor: colors.surface,
            borderColor,
            borderWidth: focused || error ? 1.5 : 1,
            minHeight: multiline ? (minHeight ?? 110) : 52,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
      />
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs + 2 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontFamily: fonts.sans,
    fontSize: 16,
  },
});
