import { StyleSheet, View } from 'react-native';
import { Skeleton } from '@/components/ui';
import { radius, space, useTheme } from '@/theme';

export function CampaignCardSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.rule }]}>
      <Skeleton height={200} style={{ borderRadius: 0 }} />
      <View style={styles.body}>
        <Skeleton width="85%" height={22} />
        <Skeleton width="40%" height={12} />
        <Skeleton height={12} />
        <Skeleton width="30%" height={22} />
        <Skeleton height={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  body: { padding: space.lg, gap: space.md },
});
