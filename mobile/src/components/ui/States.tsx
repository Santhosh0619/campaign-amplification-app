import { StyleSheet, View } from 'react-native';
import { space } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

type EmptyProps = { title: string; message: string; actionLabel?: string; onAction?: () => void };

export function EmptyState({ title, message, actionLabel, onAction }: EmptyProps) {
  return (
    <View style={styles.wrap}>
      <Text variant="heading" align="center">
        {title}
      </Text>
      <Text variant="bodySm" tone="muted" align="center">
        {message}
      </Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} variant="secondary" fullWidth={false} /> : null}
    </View>
  );
}

type ErrorProps = { title?: string; message: string; onRetry?: () => void };

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorProps) {
  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text variant="kicker" tone="danger">
        Error
      </Text>
      <Text variant="heading" align="center">
        {title}
      </Text>
      <Text variant="bodySm" tone="muted" align="center">
        {message}
      </Text>
      {onRetry ? <Button label="Try again" onPress={onRetry} variant="dark" fullWidth={false} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.md, paddingVertical: space.x4, paddingHorizontal: space.xl },
});
