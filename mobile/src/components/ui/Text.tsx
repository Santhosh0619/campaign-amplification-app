import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { fonts, useTheme, type Colors } from '@/theme';

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodySm'
  | 'label'
  | 'caption'
  | 'kicker'
  | 'number'
  | 'numberLg';

export type TextTone = 'ink' | 'muted' | 'action' | 'positive' | 'danger' | 'warn' | 'inverse';

const variants: Record<TextVariant, TextStyle> = {
  display: { fontFamily: fonts.serifSemi, fontSize: 34, lineHeight: 38, letterSpacing: -0.6 },
  title: { fontFamily: fonts.serifSemi, fontSize: 26, lineHeight: 31, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.serifSemi, fontSize: 21, lineHeight: 26, letterSpacing: -0.2 },
  subheading: { fontFamily: fonts.serifItalic, fontSize: 18, lineHeight: 26 },
  body: { fontFamily: fonts.sans, fontSize: 16, lineHeight: 25 },
  bodySm: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 21 },
  label: { fontFamily: fonts.sansSemi, fontSize: 14, lineHeight: 18 },
  caption: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16 },
  kicker: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  number: { fontFamily: fonts.serifSemi, fontSize: 22, lineHeight: 26, fontVariant: ['tabular-nums'] },
  numberLg: { fontFamily: fonts.serifSemi, fontSize: 38, lineHeight: 42, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
};

function toneColor(colors: Colors, tone: TextTone): string {
  switch (tone) {
    case 'muted':
      return colors.inkMuted;
    case 'action':
      return colors.action;
    case 'positive':
      return colors.positive;
    case 'danger':
      return colors.danger;
    case 'warn':
      return colors.warn;
    case 'inverse':
      return colors.surface;
    default:
      return colors.ink;
  }
}

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  align?: TextStyle['textAlign'];
};

export function Text({ variant = 'body', tone = 'ink', align, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  return (
    <RNText
      {...rest}
      style={[variants[variant], { color: toneColor(colors, tone) }, align ? { textAlign: align } : null, style]}
    />
  );
}
