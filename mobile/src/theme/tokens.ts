export type ColorScheme = 'light' | 'dark';

export const palette = {
  light: {
    bg: '#ECEAE4',
    surface: '#FAFAF8',
    surfaceAlt: '#E2DFD7',
    ink: '#171716',
    inkMuted: '#6B685F',
    rule: '#CFCBC1',
    action: '#D8452B',
    actionInk: '#FFFFFF',
    actionSoft: '#F3D9D2',
    positive: '#24402F',
    positiveSoft: '#D5E0D8',
    warn: '#B9801A',
    warnSoft: '#F0E2C4',
    danger: '#B3261E',
    dangerSoft: '#F2D5D2',
    overlay: 'rgba(23,23,22,0.5)',
  },
  dark: {
    bg: '#121211',
    surface: '#1C1C1A',
    surfaceAlt: '#262623',
    ink: '#F1EFE9',
    inkMuted: '#A09C91',
    rule: '#3A3935',
    action: '#F0603F',
    actionInk: '#171716',
    actionSoft: '#3D231C',
    positive: '#8FBF9F',
    positiveSoft: '#1F2E25',
    warn: '#D9A441',
    warnSoft: '#37301C',
    danger: '#F0857E',
    dangerSoft: '#3B1F1D',
    overlay: 'rgba(0,0,0,0.65)',
  },
} as const;

export type Colors = { [K in keyof (typeof palette)['light']]: string };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, x3: 32, x4: 40, x5: 56 } as const;

export const radius = { sm: 4, md: 6, lg: 10, pill: 999 } as const;

export const fonts = {
  serif: 'Newsreader_500Medium',
  serifSemi: 'Newsreader_600SemiBold',
  serifItalic: 'Newsreader_400Regular_Italic',
  sans: 'PublicSans_400Regular',
  sansMedium: 'PublicSans_500Medium',
  sansSemi: 'PublicSans_600SemiBold',
  sansBold: 'PublicSans_700Bold',
} as const;

export const layout = { gutter: 20, minTouch: 48, maxContent: 640 } as const;
