import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { ImagePlus } from 'lucide-react-native';
import { assetUrl, errorMessage } from '@/api/client';
import { Button, Text } from '@/components/ui';
import { radius, space, useTheme } from '@/theme';
import { PickError, pickAndUploadImage } from './uploadImage';

type Props = {
  label: string;
  url?: string;
  error?: string | null;
  hint?: string;
  aspectRatio?: number;
  onChange: (url: string | undefined) => void;
};

/** Pick, preview, replace or remove one uploaded image. */
export function ImageField({ label, url, error, hint, aspectRatio = 16 / 10, onChange }: Props) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const pick = async () => {
    setProblem(null);
    setBusy(true);
    try {
      const uploaded = await pickAndUploadImage();
      if (uploaded) onChange(uploaded);
    } catch (e) {
      setProblem(e instanceof PickError ? e.message : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const shown = assetUrl(url);
  const message = problem ?? error;

  return (
    <View style={{ gap: space.sm }}>
      <Text variant="label">{label}</Text>
      {shown ? (
        <View style={{ gap: space.sm }}>
          <Image source={{ uri: shown }} style={[styles.preview, { aspectRatio }]} contentFit="cover" accessibilityLabel={`${label} preview`} />
          <View style={styles.actions}>
            <Button label="Replace" variant="secondary" size="sm" onPress={pick} loading={busy} fullWidth={false} />
            <Button label="Remove" variant="ghost" size="sm" onPress={() => onChange(undefined)} fullWidth={false} />
          </View>
        </View>
      ) : (
        <Pressable
          onPress={pick}
          accessibilityRole="button"
          accessibilityLabel={`Upload ${label}`}
          style={[styles.drop, { aspectRatio, borderColor: message ? colors.danger : colors.rule, backgroundColor: colors.surface }]}
        >
          <ImagePlus size={28} color={colors.inkMuted} strokeWidth={1.5} />
          <Text variant="label">{busy ? 'Uploading…' : 'Choose a photo'}</Text>
          <Text variant="caption" tone="muted">
            JPG, PNG or WebP · up to 3 MB
          </Text>
        </Pressable>
      )}
      {message ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {message}
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
  preview: { width: '100%', borderRadius: radius.md },
  drop: { width: '100%', borderWidth: 1.5, borderStyle: 'dashed', borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 4, padding: space.lg },
  actions: { flexDirection: 'row', gap: space.sm },
});
