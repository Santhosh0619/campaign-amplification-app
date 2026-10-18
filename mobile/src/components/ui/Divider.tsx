import { View } from 'react-native';
import { useTheme } from '@/theme';

export function Divider({ strong = false }: { strong?: boolean }) {
  const { colors } = useTheme();
  return <View style={{ height: strong ? 2 : 1, backgroundColor: strong ? colors.ink : colors.rule }} />;
}
