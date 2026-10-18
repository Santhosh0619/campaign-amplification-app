import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { AdPreview } from '@/components/campaign/AdPreview';
import { CoverArt } from '@/components/campaign/CoverArt';
import { Button, Field, Text } from '@/components/ui';
import { space, useTheme } from '@/theme';
import type { Cover } from '@/types/api';
import { CheckRow } from './CheckRow';
import type { DraftForm, Problems } from './form';
import { ImageField } from './ImageField';

type Props = { form: DraftForm; update: (p: Partial<DraftForm>) => void; problems: Problems };

export function StepVisuals({ form, update, problems }: Props) {
  const { colors } = useTheme();
  const [aiError, setAiError] = useState<string | null>(null);

  const generate = useMutation({
    mutationFn: () => api<{ cover: Cover }>('/ai/cover', { method: 'POST', body: { title: form.title } }),
    onSuccess: (r) => {
      setAiError(null);
      update({ cover: r.cover });
    },
    onError: (e) => setAiError(errorMessage(e)),
  });

  const cover = form.cover;
  const uploaded = Boolean(cover.url);
  const hasCover = uploaded || cover.generated;
  const ad = form.ad;

  const setAd = (p: Partial<DraftForm['ad']>) => update({ ad: { ...ad, ...p } });

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: 4 }}>
        <Text variant="title">Campaign and ad visuals</Text>
        <Text variant="bodySm" tone="muted">
          The cover appears on your campaign page. The ad can reuse it or use its own image and wording.
        </Text>
      </View>

      <View style={{ gap: space.md }}>
        <Text variant="heading">Campaign cover</Text>
        {hasCover && !uploaded ? (
          <View style={{ gap: space.sm }}>
            <CoverArt seed={form.title || 'new'} category={form.category || 'Other'} ratio={16 / 10} />
            <Text variant="caption" tone="muted">
              Generated cover (demo). It needs no image rights.
            </Text>
            <View style={styles.actions}>
              <Button label="Generate again" variant="secondary" size="sm" onPress={() => generate.mutate()} loading={generate.isPending} fullWidth={false} />
              <Button label="Remove" variant="ghost" size="sm" onPress={() => update({ cover: {} })} fullWidth={false} />
            </View>
          </View>
        ) : (
          <ImageField
            label="Cover image"
            url={cover.url}
            error={problems.cover}
            hint="Landscape works best. Your image is used as uploaded."
            onChange={(url) => update({ cover: url ? { url, alt: cover.alt, rightsConfirmed: false } : {} })}
          />
        )}

        {!hasCover ? (
          <View style={{ gap: space.xs }}>
            <Button label="Generate a cover (demo)" variant="secondary" onPress={() => generate.mutate()} loading={generate.isPending} />
            {aiError ? (
              <Text variant="caption" tone="danger">
                {aiError}
              </Text>
            ) : null}
          </View>
        ) : null}

        {uploaded ? (
          <>
            <Field label="Describe the image" value={cover.alt ?? ''} onChangeText={(t) => update({ cover: { ...cover, alt: t } })} maxLength={200} hint="For screen readers and if the image fails to load." />
            <CheckRow
              checked={Boolean(cover.rightsConfirmed)}
              onChange={(v) => update({ cover: { ...cover, rightsConfirmed: v } })}
              label="I own this image or have permission to use it. Required to submit."
              error={problems.coverRights}
            />
          </>
        ) : null}
      </View>

      <View style={{ gap: space.md }}>
        <Text variant="heading">The ad</Text>
        <View style={[styles.switchRow, { borderColor: colors.rule }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="label">Give the ad its own image and text</Text>
            <Text variant="caption" tone="muted">
              Off: the ad reuses your cover, short description and the start of your title.
            </Text>
          </View>
          <Switch
            value={ad.useOwn}
            onValueChange={(v) => setAd({ useOwn: v })}
            trackColor={{ true: colors.positive, false: colors.rule }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Give the ad its own image and text"
          />
        </View>

        {ad.useOwn ? (
          <View style={{ gap: space.lg }}>
            <Field
              label="Ad headline"
              required
              value={ad.headline}
              onChangeText={(t) => setAd({ headline: t })}
              maxLength={40}
              showCounter
              error={problems.adHeadline}
              hint="Most placements cut text after 40 characters."
            />
            <Field
              label="Ad text"
              required
              value={ad.primaryText}
              onChangeText={(t) => setAd({ primaryText: t })}
              multiline
              minHeight={84}
              maxLength={125}
              showCounter
              error={problems.adPrimaryText}
              hint="Keep it under 125 characters so nothing is hidden behind “See more”."
            />
            <ImageField
              label="Ad image (optional)"
              url={ad.image?.url}
              hint="Leave empty to use your cover."
              onChange={(url) => setAd({ image: url ? { url, rightsConfirmed: false } : undefined })}
            />
            {ad.image?.url ? (
              <CheckRow
                checked={Boolean(ad.image.rightsConfirmed)}
                onChange={(v) => setAd({ image: { ...ad.image, rightsConfirmed: v } })}
                label="I own this image or have permission to use it."
                error={problems.adImageRights}
              />
            ) : null}
          </View>
        ) : null}

        <AdPreview
          primaryText={ad.useOwn ? ad.primaryText : form.shortDescription}
          headline={ad.useOwn ? ad.headline : form.title.slice(0, 40)}
          seed={form.title || 'new'}
          category={form.category || 'Other'}
          cover={ad.useOwn && ad.image?.url ? ad.image : cover}
          network={form.platforms.join(', ') || 'Facebook'}
        />
        <Text variant="caption" tone="muted">
          The ad always links to your campaign page and only runs after review.
        </Text>
        {!hasCover ? (
          <Text variant="caption" tone="warn">
            No cover yet. The preview shows a placeholder until you add one.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingVertical: space.md, borderTopWidth: 1, borderBottomWidth: 1 },
});
