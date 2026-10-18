import { useState } from 'react';
import { View } from 'react-native';
import {
  Accordion,
  Button,
  Chip,
  Divider,
  EmptyState,
  ErrorState,
  Field,
  ProgressBar,
  Screen,
  ScreenHeader,
  Sheet,
  Skeleton,
  StatusChip,
  Text,
} from '@/components/ui';
import { space } from '@/theme';

// Internal gallery used to review the design system. Not linked from the app UI.
export default function DevGallery() {
  const [title, setTitle] = useState('');
  const [sheet, setSheet] = useState(false);
  const [chip, setChip] = useState('Health');

  return (
    <Screen contentStyle={{ gap: space.xxl }}>
      <ScreenHeader title="Design system" />
      <View style={{ gap: space.sm }}>
        <Text variant="kicker" tone="action">
          Typography
        </Text>
        <Text variant="display">Messages that travel beyond your feed.</Text>
        <Text variant="title">Clean drinking water in every public school</Text>
        <Text variant="subheading" tone="muted">
          A district-by-district push to replace lead service lines.
        </Text>
        <Text variant="body">
          Body copy sits at sixteen pixels with a generous line height so a long story stays comfortable to read on a phone.
        </Text>
        <Text variant="numberLg">$5,240</Text>
        <Text variant="caption" tone="muted">
          of $8,000 · demo data
        </Text>
      </View>

      <Divider strong />

      <View style={{ gap: space.md }}>
        <Text variant="kicker" tone="action">
          Buttons
        </Text>
        <Button label="Back this campaign" />
        <Button label="Save as draft" variant="secondary" />
        <Button label="Continue" variant="dark" />
        <Button label="Loading" loading />
        <Button label="Disabled" disabled />
        <Button label="Delete draft" variant="danger" />
      </View>

      <View style={{ gap: space.md }}>
        <Text variant="kicker" tone="action">
          Chips and status
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {['Health', 'Civic', 'Environment'].map((c) => (
            <Chip key={c} label={c} selected={chip === c} onPress={() => setChip(c)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <StatusChip label="Draft" />
          <StatusChip label="In review" tone="warn" />
          <StatusChip label="Funding" tone="action" />
          <StatusChip label="Promoting" tone="positive" />
          <StatusChip label="Rejected" tone="danger" />
        </View>
      </View>

      <View style={{ gap: space.md }}>
        <Text variant="kicker" tone="action">
          Field and progress
        </Text>
        <Field
          label="Campaign title"
          required
          value={title}
          onChangeText={setTitle}
          maxLength={60}
          showCounter
          hint="The first 40 characters are used as the ad headline."
          placeholder="e.g. Plant the shade where the heat is"
        />
        <Field label="Error example" value="" error="This field is required." />
        <ProgressBar value={0.66} />
      </View>

      <View>
        <Accordion title="How is support spent?" defaultOpen>
          <Text variant="bodySm">80% goes to ad reach. 20% is the platform fee. Card processing fees apply.</Text>
        </Accordion>
        <Accordion title="How was this reviewed?">
          <Text variant="bodySm">Sources are checked before a campaign is published.</Text>
        </Accordion>
        <Divider />
      </View>

      <View style={{ gap: space.md }}>
        <Text variant="kicker" tone="action">
          States
        </Text>
        <Skeleton height={180} />
        <Skeleton width="70%" height={20} />
        <EmptyState title="No campaigns yet" message="When you create a campaign it will show up here." actionLabel="Start a campaign" onAction={() => setSheet(true)} />
        <ErrorState message="We could not load campaigns. Check your connection." onRetry={() => setSheet(true)} />
      </View>

      <Sheet visible={sheet} title="Estimated reach" onClose={() => setSheet(false)}>
        <Text variant="body">
          Estimated reach is a projection based on the current platform rate. It is not a promise of delivery.
        </Text>
      </Sheet>
    </Screen>
  );
}
