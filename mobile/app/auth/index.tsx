import { EmptyState, Screen, ScreenHeader } from '@/components/ui';

export default function AuthScreen() {
  return (
    <Screen>
      <ScreenHeader title="Sign in" />
      <EmptyState title="Sign in" message="Built in the auth feature." />
    </Screen>
  );
}
