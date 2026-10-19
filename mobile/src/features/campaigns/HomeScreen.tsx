import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useCampaignList, useConfig, useFeatured } from '@/api/hooks';
import { CampaignCard } from '@/components/campaign/CampaignCard';
import { CampaignCardSkeleton } from '@/components/campaign/CampaignCardSkeleton';
import { EstimateNote } from '@/components/campaign/EstimateNote';
import { HowItWorks } from '@/components/campaign/HowItWorks';
import { Button, Divider, ErrorState, Screen, Text } from '@/components/ui';
import { errorMessage } from '@/api/client';
import { layout, radius, space, useTheme } from '@/theme';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/store/auth';

export function HomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const cfg = useConfig();
  const user = useAuth((s) => s.user);
  const featured = useFeatured();
  const feed = useCampaignList({ sort: 'recommended' }, 6);
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Screen padded={false} contentStyle={{ paddingBottom: space.x5 }}>
      <View style={[styles.pad, styles.top]}>
        <Text variant="heading" style={{ letterSpacing: -0.4 }}>
          Campaign
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
          {!user ? (
            <Pressable onPress={() => router.push('/auth')} accessibilityRole="button" hitSlop={8}>
              <Text variant="label">Sign in</Text>
            </Pressable>
          ) : (
            <Text variant="caption" tone="muted" numberOfLines={1} style={{ maxWidth: 150 }}>
              {user.name}
            </Text>
          )}
          <ThemeToggle />
        </View>
      </View>

      <View style={[styles.pad, styles.hero]}>
        <Text variant="kicker" tone="action">
          Community-funded reach
        </Text>
        <Text variant="display">Messages that travel beyond your feed.</Text>
        <Text variant="body" tone="muted">
          Creators write a message and list their sources. Backers pool small amounts to put it in front of people outside the creator’s own network.
        </Text>
        <View style={[styles.estimate, { borderColor: colors.ink }]}>
          <Text variant="numberLg" tone="action">
            ≈ {cfg.reachPerDollar}
          </Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="label">people reached for every $1</Text>
            <EstimateNote>Estimate, not a guarantee</EstimateNote>
          </View>
        </View>
        <View style={{ gap: space.md }}>
          <Button label="Explore campaigns" onPress={() => router.push('/explore')} />
          <Button label="Start a campaign" variant="secondary" onPress={() => router.push('/create')} />
        </View>
      </View>

      <Section title="Featured" actionLabel="See all" onAction={() => router.push('/explore')} />
      {featured.isLoading ? (
        <View style={styles.pad}>
          <CampaignCardSkeleton />
        </View>
      ) : featured.isError ? null : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.pad, { gap: space.md }]} snapToInterval={296} decelerationRate="fast">
          {featured.data?.items.map((c) => (
            <View key={c.id} style={{ width: 284 }}>
              <CampaignCard campaign={c} compact />
            </View>
          ))}
        </ScrollView>
      )}

      <View style={[styles.pad, { marginTop: space.x3 }]}>
        <Text variant="kicker" tone="muted">
          How it works
        </Text>
        <Text variant="title" style={{ marginTop: space.sm, marginBottom: space.md }}>
          Create. Review. Amplify.
        </Text>
        <HowItWorks />
        <Divider />
      </View>

      <View style={[styles.pad, { marginTop: space.x3 }]}>
        <View style={[styles.why, { backgroundColor: colors.ink }]}>
          <Text variant="kicker" style={{ color: colors.action }}>
            The fair question
          </Text>
          <Text variant="title" style={{ color: colors.bg }}>
            Why back a message instead of donating?
          </Text>
          <Text variant="body" style={{ color: colors.bg, opacity: 0.85 }}>
            A donation pays for the work itself. A contribution here pays only for the message to reach people outside the creator’s network, so more potential supporters hear it.
          </Text>
          <Text variant="bodySm" style={{ color: colors.bg, opacity: 0.7 }}>
            Money never goes to the cause directly. Most of it buys ads, and every backer gets a report.
          </Text>
        </View>
      </View>

      <Section title="Open for backing" actionLabel="Explore" onAction={() => router.push('/explore')} />
      <View style={[styles.pad, { gap: space.lg }]}>
        {feed.isLoading ? (
          <>
            <CampaignCardSkeleton />
            <CampaignCardSkeleton />
          </>
        ) : feed.isError ? (
          <ErrorState message={errorMessage(feed.error)} onRetry={() => feed.refetch()} />
        ) : (
          items.map((c) => <CampaignCard key={c.id} campaign={c} />)
        )}
        {items.length > 0 ? <Button label="See every campaign" variant="secondary" onPress={() => router.push('/explore')} /> : null}
      </View>
    </Screen>
  );
}

function Section({ title, actionLabel, onAction }: { title: string; actionLabel: string; onAction: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.pad, styles.section]}>
      <Text variant="title">{title}</Text>
      <Pressable onPress={onAction} accessibilityRole="button" style={styles.sectionAction} hitSlop={8}>
        <Text variant="label">{actionLabel}</Text>
        <ArrowRight size={16} color={colors.ink} strokeWidth={1.75} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: layout.gutter },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52 },
  hero: { gap: space.lg, paddingTop: space.lg, paddingBottom: space.x3 },
  estimate: { flexDirection: 'row', alignItems: 'center', gap: space.lg, borderTopWidth: 2, borderBottomWidth: 1, paddingVertical: space.md },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: space.x3, marginBottom: space.md },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  why: { borderRadius: radius.lg, padding: space.xxl, gap: space.md },
});
