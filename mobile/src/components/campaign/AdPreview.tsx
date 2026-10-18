import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { radius, space } from '@/theme';
import type { Cover } from '@/types/api';
import { CoverArt } from './CoverArt';

type Props = {
  primaryText: string;
  headline: string;
  seed: string;
  category: string;
  cover?: Cover;
  cta?: string;
  network?: string;
};

/**
 * A neutral mock of a sponsored feed post. It is deliberately not a copy of any network's UI:
 * it shows what will be said and what the image looks like, which is all a creator or backer needs.
 */
export function AdPreview({ primaryText, headline, seed, category, cover, cta = 'Learn more', network = 'Facebook and Instagram' }: Props) {
  return (
    <View style={styles.wrap}>
      <Text variant="kicker" tone="muted">
        Ad preview · {network}
      </Text>
      <View style={styles.post}>
        <View style={styles.postHead}>
          <View style={styles.avatar}>
            <Text variant="label" style={{ color: '#FAFAF8' }}>
              C
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="label" style={styles.dark}>
              Campaign · Community-funded
            </Text>
            <Text variant="caption" style={styles.muted}>
              Sponsored
            </Text>
          </View>
        </View>
        <Text variant="bodySm" style={[styles.dark, { paddingHorizontal: space.md, paddingBottom: space.sm }]} numberOfLines={4}>
          {primaryText || 'Your ad text appears here.'}
        </Text>
        <CoverArt seed={seed} category={category} cover={cover} ratio={1.6} radiusSize={0} label={false} />
        <View style={styles.cta}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" style={styles.muted}>
              CAMPAIGN.EXAMPLE.COM
            </Text>
            <Text variant="label" style={styles.dark} numberOfLines={2}>
              {headline || 'Your headline appears here'}
            </Text>
          </View>
          <View style={styles.ctaButton}>
            <Text variant="label" style={styles.dark}>
              {cta}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  // The mock is always light so it reads as an ad "on a page", in both app themes.
  post: { backgroundColor: '#FFFFFF', borderRadius: radius.md, overflow: 'hidden', borderWidth: 1, borderColor: '#D9D6CE' },
  postHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#171716', alignItems: 'center', justifyContent: 'center' },
  dark: { color: '#171716' },
  muted: { color: '#6B685F' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, backgroundColor: '#F1EFE9' },
  ctaButton: { borderWidth: 1, borderColor: '#171716', borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: 8, backgroundColor: '#FFFFFF' },
});
