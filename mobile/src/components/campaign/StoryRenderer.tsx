import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { assetUrl } from '@/api/client';
import { RichText, Text } from '@/components/ui';
import { radius, space, useTheme } from '@/theme';
import type { StoryBlock } from '@/types/api';

/** Renders story blocks as an article. Shared by the public page and the creator's preview. */
export function StoryRenderer({ blocks }: { blocks: StoryBlock[] }) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      {blocks.map((b) => {
        switch (b.type) {
          case 'heading':
            return b.text ? (
              <Text key={b.id} variant="heading" style={styles.heading}>
                {b.text}
              </Text>
            ) : null;
          case 'paragraph':
            return b.text ? (
              <RichText key={b.id} variant="body" style={styles.paragraph}>
                {b.text}
              </RichText>
            ) : null;
          case 'stat':
            return (
              <View key={b.id} style={[styles.stat, { borderColor: colors.ink }]}>
                <Text variant="numberLg" tone="action">
                  {b.value}
                </Text>
                <Text variant="bodySm" tone="muted">
                  {b.label}
                </Text>
              </View>
            );
          case 'quote':
            return (
              <View key={b.id} style={[styles.quote, { borderColor: colors.action }]}>
                <Text variant="subheading" style={{ fontSize: 20, lineHeight: 29 }}>
                  “{b.text}”
                </Text>
                {b.credit ? (
                  <Text variant="caption" tone="muted">
                    {b.credit}
                  </Text>
                ) : null}
              </View>
            );
          case 'list':
            return (
              <View key={b.id} style={{ gap: space.sm }}>
                {(b.items ?? []).map((item, i) => (
                  <View key={`${b.id}-${i}`} style={styles.listRow}>
                    <View style={[styles.bullet, { backgroundColor: colors.ink }]} />
                    <RichText variant="body" style={{ flex: 1 }}>
                      {item}
                    </RichText>
                  </View>
                ))}
              </View>
            );
          case 'image': {
            const uri = assetUrl(b.imageUrl);
            return uri ? (
              <View key={b.id} style={{ gap: 6 }}>
                <Image source={{ uri }} style={styles.image} contentFit="cover" accessibilityLabel={b.caption ?? 'Story image'} />
                {b.caption || b.credit ? (
                  <Text variant="caption" tone="muted">
                    {b.caption}
                    {b.credit ? ` · ${b.credit}` : ''}
                  </Text>
                ) : null}
              </View>
            ) : null;
          }
          default:
            return null;
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  heading: { marginTop: space.md },
  paragraph: { fontSize: 17, lineHeight: 28 },
  stat: { borderTopWidth: 2, paddingTop: space.md, gap: 2 },
  quote: { borderLeftWidth: 3, paddingLeft: space.lg, gap: space.sm },
  listRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 11 },
  image: { width: '100%', aspectRatio: 16 / 10, borderRadius: radius.md },
});
