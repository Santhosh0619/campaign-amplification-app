import { StyleSheet, View } from 'react-native';
import { Button, Field, Text } from '@/components/ui';
import { space, useTheme } from '@/theme';
import type { Source } from '@/types/api';
import { newBlockId, type Problems } from './form';

type Props = { sources: Source[]; onChange: (s: Source[]) => void; problems: Problems };

/** Evidence list. Sources stay visible on the public page, so each one needs a title and a link. */
export function SourcesEditor({ sources, onChange, problems }: Props) {
  const { colors } = useTheme();
  const patch = (id: string, p: Partial<Source>) => onChange(sources.map((s) => (s.id === id ? { ...s, ...p } : s)));

  return (
    <View style={{ gap: space.lg }}>
      <Text variant="bodySm" tone="muted">
        List where your claims come from. Readers see these on the campaign page, and reviewers check them.
      </Text>
      {sources.map((s, i) => (
        <View key={s.id} style={[styles.row, { borderColor: colors.rule, backgroundColor: colors.surface }]}>
          <Field label={`Source ${i + 1} title`} value={s.title} onChangeText={(t) => patch(s.id, { title: t })} maxLength={200} placeholder="e.g. County water testing results" />
          <Field
            label="Link"
            value={s.url}
            onChangeText={(t) => patch(s.id, { url: t })}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            maxLength={500}
            placeholder="https://"
            error={problems[`source_${i}`]}
          />
          <Button label="Remove source" variant="ghost" size="sm" onPress={() => onChange(sources.filter((x) => x.id !== s.id))} fullWidth={false} />
        </View>
      ))}
      <Button label="+ Add a source" variant="secondary" onPress={() => onChange([...sources, { id: newBlockId(), title: '', url: '' }])} />
    </View>
  );
}

const styles = StyleSheet.create({ row: { borderWidth: 1, padding: space.lg, gap: space.md } });
