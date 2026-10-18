import { EmptyState, Screen, ScreenHeader } from '@/components/ui';

export default function BackScreen() {
  return (
    <Screen>
      <ScreenHeader title="Back this campaign" />
      <EmptyState title="Back this campaign" message="Built in the back flow feature." />
    </Screen>
  );
}
