import { useState } from 'react';
import { View } from 'react-native';
import { StoryRenderer } from '@/components/campaign/StoryRenderer';
import { Button, Field, Text } from '@/components/ui';
import { space } from '@/theme';
import { BlockEditor } from './BlockEditor';
import { wordCount, type DraftForm, type Problems } from './form';
import { SourcesEditor } from './SourcesEditor';

type Props = { form: DraftForm; update: (p: Partial<DraftForm>) => void; problems: Problems };

export function StepStory({ form, update, problems }: Props) {
  const [preview, setPreview] = useState(false);
  const words = wordCount(form.story);

  return (
    <View style={{ gap: space.xl }}>
      <View style={{ gap: 4 }}>
        <Text variant="title">Tell your story</Text>
        <Text variant="bodySm" tone="muted">
          Write it like a short article. Break it up with headings and figures, and give every figure a source.
        </Text>
      </View>

      <Field
        label="Short description"
        required
        value={form.shortDescription}
        onChangeText={(t) => update({ shortDescription: t })}
        multiline
        minHeight={84}
        maxLength={150}
        showCounter
        error={problems.shortDescription}
        hint="Appears under the title, on campaign cards, and as the ad’s main text unless you customise the ad."
      />

      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text variant="label">
            Full story
            <Text variant="label" tone="action">
              {' *'}
            </Text>
          </Text>
          <Text variant="caption" tone="muted">
            {words} words
          </Text>
        </View>
        <BlockEditor blocks={form.story} onChange={(story) => update({ story })} error={problems.story} />
      </View>

      <View style={{ gap: space.md }}>
        <Text variant="heading">Sources</Text>
        <SourcesEditor sources={form.sources} onChange={(sources) => update({ sources })} problems={problems} />
      </View>

      <Field
        label="Why should backers care?"
        value={form.whyBackersCare}
        onChangeText={(t) => update({ whyBackersCare: t })}
        multiline
        minHeight={96}
        maxLength={2000}
        hint="Shown as “Why should you back this?” on the campaign page."
      />

      <View style={{ gap: space.md }}>
        <Button label={preview ? 'Hide live preview' : 'Show live preview'} variant="secondary" onPress={() => setPreview((v) => !v)} />
        {preview ? (
          <View style={{ gap: space.md, paddingTop: space.md }}>
            <Text variant="kicker" tone="muted">
              Preview
            </Text>
            <Text variant="title">{form.title || 'Your title'}</Text>
            <Text variant="subheading" tone="muted">
              {form.shortDescription || 'Your short description'}
            </Text>
            <StoryRenderer blocks={form.story} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
