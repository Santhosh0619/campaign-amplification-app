import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { palette, type ColorScheme, type Colors } from './tokens';

type Theme = { scheme: ColorScheme; colors: Colors };

const ThemeContext = createContext<Theme>({ scheme: 'light', colors: palette.light });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const scheme: ColorScheme = system === 'dark' ? 'dark' : 'light';
  const value = useMemo(() => ({ scheme, colors: palette[scheme] }), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
