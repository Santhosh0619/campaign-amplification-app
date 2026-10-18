import { Pressable, StyleSheet, View } from 'react-native';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react-native';
import { Chip, Field, Text } from '@/components/ui';
import { space, useTheme } from '@/theme';
import type { StoryBlock } from '@/types/api';
import { newBlockId } from './form';
import { ImageField } from './ImageField';

type Props = { blocks: StoryBlock[]; onChange: (b: StoryBlock[]) => void; error?: string | null };

const addable: { type: StoryBlock['type']; label: string }[] = [
  { type: 'paragraph', label: 'Paragraph' },
  { type: 'heading', label: 'Heading' },
  { type: 'image', label: 'Image' },
  { type: 'stat', label: 'Statistic' },
  { type: 'quote', label: 'Quote' },
  { type: 'list', label: 'List' },
];

const names: Record<StoryBlock['type'], string> = {
  paragraph: 'Paragraph',
  heading: 'Heading',
  image: 'Image',
  stat: 'Statistic',
  quote: 'Quote',
  list: 'List',
};

/** Article-style composer: ordered blocks the creator can add, edit, move and remove. */
export function BlockEditor({ blocks, onChange, error }: Props) {
  const { colors } = useTheme();

  const patch = (id: string, p: Partial<StoryBlock>) => onChange(blocks.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const remove = (id: string) => onChange(blocks.filter((b) => b.id !== id));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = (type: StoryBlock['type']) => onChange([...blocks, { id: newBlockId(), type, text: type === 'paragraph' || type === 'heading' || type === 'quote' ? '' : undefined, items: type === 'list' ? [''] : undefined }]);

  return (
    <View style={{ gap: space.lg }}>
      {blocks.length === 0 ? (
        <View style={[styles.empty, { borderColor: error ? colors.danger : colors.rule }]}>
          <Text variant="label">Start with a paragraph</Text>
          <Text variant="bodySm" tone="muted">
            Tell the story the way you would explain it to a friend: what is happening, who it affects and what should change.
          </Text>
        </View>
      ) : null}

      {blocks.map((b, i) => (
        <View key={b.id} style={[styles.block, { borderColor: colors.rule, backgroundColor: colors.surface }]}>
          <View style={styles.blockHead}>
            <Text variant="kicker" tone="muted" style={{ flex: 1 }}>
              {names[b.type]}
            </Text>
            <IconButton label="Move up" disabled={i === 0} onPress={() => move(i, -1)}>
              <ArrowUp size={18} color={colors.ink} strokeWidth={1.75} />
            </IconButton>
            <IconButton label="Move down" disabled={i === blocks.length - 1} onPress={() => move(i, 1)}>
              <ArrowDown size={18} color={colors.ink} strokeWidth={1.75} />
            </IconButton>
            <IconButton label={`Delete ${names[b.type]}`} onPress={() => remove(b.id)}>
              <Trash2 size={18} color={colors.danger} strokeWidth={1.75} />
            </IconButton>
          </View>

          {b.type === 'paragraph' ? (
            <Field label="Text" value={b.text ?? ''} onChangeText={(t) => patch(b.id, { text: t })} multiline minHeight={110} maxLength={4000} />
          ) : null}
          {b.type === 'heading' ? <Field label="Heading" value={b.text ?? ''} onChangeText={(t) => patch(b.id, { text: t })} maxLength={120} /> : null}
          {b.type === 'stat' ? (
            <>
              <Field label="Number or figure" value={b.value ?? ''} onChangeText={(t) => patch(b.id, { value: t })} maxLength={40} placeholder="e.g. 11 of 30" />
              <Field label="What it measures" value={b.label ?? ''} onChangeText={(t) => patch(b.id, { label: t })} maxLength={200} hint="Every figure needs a source in the Sources list below." />
            </>
          ) : null}
          {b.type === 'quote' ? (
            <>
              <Field label="Quote" value={b.text ?? ''} onChangeText={(t) => patch(b.id, { text: t })} multiline minHeight={84} maxLength={600} />
              <Field label="Who said it (optional)" value={b.credit ?? ''} onChangeText={(t) => patch(b.id, { credit: t })} maxLength={120} />
            </>
          ) : null}
          {b.type === 'list' ? (
            <Field
              label="Items, one per line"
              value={(b.items ?? []).join('\n')}
              onChangeText={(t) => patch(b.id, { items: t.split('\n').slice(0, 20) })}
              multiline
              minHeight={96}
            />
          ) : null}
          {b.type === 'image' ? (
            <>
              <ImageField label="Photo" url={b.imageUrl} onChange={(url) => patch(b.id, { imageUrl: url })} />
              <Field label="Caption" value={b.caption ?? ''} onChangeText={(t) => patch(b.id, { caption: t })} maxLength={300} />
              <Field label="Image credit" value={b.credit ?? ''} onChangeText={(t) => patch(b.id, { credit: t })} maxLength={120} hint="Photographer or source, e.g. Photo: Alex Kim." />
            </>
          ) : null}
        </View>
      ))}

      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Text variant="label">Add to the story</Text>
        <View style={styles.adds}>
          {addable.map((a) => (
            <Chip key={a.type} label={`+ ${a.label}`} onPress={() => add(a.type)} />
          ))}
        </View>
      </View>
    </View>
  );
}

function IconButton({ children, onPress, label, disabled }: { children: React.ReactNode; onPress: () => void; label: string; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} hitSlop={4} style={[styles.icon, { opacity: disabled ? 0.3 : 1 }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  empty: { borderWidth: 1.5, borderStyle: 'dashed', padding: space.lg, gap: 4 },
  block: { borderWidth: 1, padding: space.lg, gap: space.md },
  blockHead: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  adds: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
