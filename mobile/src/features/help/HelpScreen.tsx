import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Accordion, Divider, EmptyState, Screen, ScreenHeader, Text } from '@/components/ui';
import { space } from '@/theme';
import { helpTopics } from './content';

export function HelpScreen() {
  const { topic } = useLocalSearchParams<{ topic: string }>();
  const t = helpTopics[String(topic)];

  if (!t) {
    return (
      <Screen>
        <ScreenHeader title="Help" />
        <EmptyState title="Page not found" message="That help page does not exist." />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Help" />
      <View style={{ gap: space.xl }}>
        <View style={{ gap: space.sm }}>
          <Text variant="display">{t.title}</Text>
          <Text variant="body" tone="muted">
            {t.intro}
          </Text>
        </View>
        <View>
          {t.sections.map((s, i) => (
            <Accordion key={s.title} title={s.title} defaultOpen={i === 0 && t.sections.length <= 4}>
              {s.body.map((p) => (
                <Text key={p} variant="body" tone="muted">
                  {p}
                </Text>
              ))}
            </Accordion>
          ))}
          <Divider />
        </View>
      </View>
    </Screen>
  );
}
