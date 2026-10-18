import { EmptyState, Screen, ScreenHeader } from '@/components/ui';

export default function CampaignScreen() {
  return (
    <Screen>
      <ScreenHeader title="Campaign" />
      <EmptyState title="Campaign" message="Built in the campaign detail feature." />
    </Screen>
  );
}
