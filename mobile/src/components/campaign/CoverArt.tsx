import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { assetUrl } from '@/api/client';
import { radius } from '@/theme';
import type { Cover } from '@/types/api';
import { Text } from '@/components/ui';

type Scheme = { bg: string; fg: string; accent: string };

// Printed-poster palettes. None are purple or gradient; each pairs a flat ground with two inks.
const schemes: Scheme[] = [
  { bg: '#D8452B', fg: '#F4E9D6', accent: '#171716' },
  { bg: '#24402F', fg: '#E9DFC9', accent: '#D8452B' },
  { bg: '#171716', fg: '#D8452B', accent: '#E9DFC9' },
  { bg: '#C9942E', fg: '#171716', accent: '#F4E9D6' },
  { bg: '#3F4B52', fg: '#E7DCC4', accent: '#D8452B' },
  { bg: '#E3D7BC', fg: '#24402F', accent: '#D8452B' },
  { bg: '#B5654A', fg: '#F4E9D6', accent: '#24402F' },
];

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Props = { seed: string; category: string; cover?: Cover; ratio?: number; label?: boolean; radiusSize?: number };

function Shapes({ kind, s }: { kind: number; s: Scheme }) {
  switch (kind) {
    case 0: // sun and horizon
      return (
        <G>
          <Circle cx={280} cy={120} r={92} fill={s.fg} />
          <Rect x={0} y={190} width={400} height={110} fill={s.accent} />
          <Rect x={0} y={206} width={400} height={6} fill={s.fg} />
        </G>
      );
    case 1: // columns
      return (
        <G>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <Rect key={i} x={30 + i * 52} y={300 - (70 + ((i * 53) % 130))} width={34} height={70 + ((i * 53) % 130)} fill={i % 3 === 0 ? s.accent : s.fg} />
          ))}
        </G>
      );
    case 2: // concentric arcs
      return (
        <G>
          {[210, 160, 110, 60].map((r, i) => (
            <Circle key={r} cx={340} cy={300} r={r} fill={i % 2 === 0 ? s.fg : s.accent} />
          ))}
        </G>
      );
    case 3: // dot grid
      return (
        <G>
          {Array.from({ length: 6 }).flatMap((_, row) =>
            Array.from({ length: 11 }).map((__, col) => (
              <Circle key={`${row}-${col}`} cx={30 + col * 34} cy={40 + row * 44} r={(row + col) % 4 === 0 ? 11 : 6} fill={(row + col) % 4 === 0 ? s.accent : s.fg} />
            ))
          )}
        </G>
      );
    case 4: // diagonal stripes
      return (
        <G>
          {Array.from({ length: 9 }).map((_, i) => (
            <Path key={i} d={`M${i * 60 - 80} 300 L${i * 60 + 60} 0 L${i * 60 + 90} 0 L${i * 60 - 50} 300 Z`} fill={i % 2 === 0 ? s.fg : s.accent} />
          ))}
        </G>
      );
    case 5: // blocks / skyline
      return (
        <G>
          <Rect x={30} y={120} width={90} height={180} fill={s.fg} />
          <Rect x={130} y={70} width={70} height={230} fill={s.accent} />
          <Rect x={210} y={150} width={80} height={150} fill={s.fg} />
          <Rect x={300} y={100} width={70} height={200} fill={s.accent} />
          {[0, 1, 2].map((i) => (
            <Rect key={i} x={46} y={140 + i * 40} width={22} height={18} fill={s.accent} />
          ))}
        </G>
      );
    case 6: // waves
      return (
        <G>
          {[0, 1, 2, 3].map((i) => (
            <Path
              key={i}
              d={`M0 ${120 + i * 42} Q 50 ${80 + i * 42} 100 ${120 + i * 42} T 200 ${120 + i * 42} T 300 ${120 + i * 42} T 400 ${120 + i * 42} L400 300 L0 300 Z`}
              fill={i % 2 === 0 ? s.fg : s.accent}
              opacity={1 - i * 0.12}
            />
          ))}
        </G>
      );
    default: // mountains
      return (
        <G>
          <Path d="M0 300 L120 110 L220 300 Z" fill={s.fg} />
          <Path d="M130 300 L270 70 L400 300 Z" fill={s.accent} />
          <Circle cx={330} cy={60} r={28} fill={s.fg} />
        </G>
      );
  }
}

function CoverArtImpl({ seed, category, cover, ratio = 4 / 3, label = true, radiusSize = radius.lg }: Props) {
  const uri = assetUrl(cover?.url);
  const kind = hash(category) % 8;
  const scheme = schemes[hash(`${category}:${seed}`) % schemes.length];

  return (
    <View style={[styles.frame, { aspectRatio: ratio, borderRadius: radiusSize, backgroundColor: scheme.bg }]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessibilityLabel={cover?.alt} />
      ) : (
        <>
          <Svg width="100%" height="100%" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" accessibilityLabel={cover?.alt}>
            <Rect width={400} height={300} fill={scheme.bg} />
            <Shapes kind={kind} s={scheme} />
          </Svg>
          {label ? (
            <View style={styles.tag}>
              <Text variant="kicker" style={{ color: '#F4E9D6' }}>
                {category}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

export const CoverArt = memo(CoverArtImpl);

const styles = StyleSheet.create({
  frame: { width: '100%', overflow: 'hidden' },
  tag: { position: 'absolute', left: 12, top: 12, backgroundColor: '#171716', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 3 },
});
