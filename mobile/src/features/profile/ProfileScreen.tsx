import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useMyCampaigns } from '@/api/hooks';
import { Button, ListRow, Screen, Text, ThemeSwitch } from '@/components/ui';
import { money, shortDate } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { space, useTheme } from '@/theme';
import type { CampaignCard } from '@/types/api';

type Impact = { backed: { count: number; totalContributed: number; campaigns: CampaignCard[] }; created: { count: number } };

export function ProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const mine = useMyCampaigns(Boolean(user));
  const impact = useQuery({ queryKey: ['impact', 'all'], queryFn: () => api<Impact>('/me/impact?range=all'), enabled: Boolean(user) });

  const helpRows = (
    <View style={{ gap: space.lg }}>
      <ThemeSwitch />
      <View>
      <Text variant="kicker" tone="muted" style={styles.section}>
        Help and about
      </Text>
      <ListRow title="How it works" onPress={() => router.push({ pathname: '/help/[topic]', params: { topic: 'how-it-works' } })} />
      <ListRow title="How we review campaigns" onPress={() => router.push({ pathname: '/help/[topic]', params: { topic: 'how-we-review' } })} />
      <ListRow title="Why fund a campaign" onPress={() => router.push({ pathname: '/help/[topic]', params: { topic: 'why-fund' } })} />
      <ListRow title="FAQ and help" onPress={() => router.push({ pathname: '/help/[topic]', params: { topic: 'faq' } })} />
      <ListRow title="Partners" onPress={() => router.push({ pathname: '/help/[topic]', params: { topic: 'partners' } })} />
      <ListRow title="About, contact, terms and privacy" onPress={() => router.push({ pathname: '/help/[topic]', params: { topic: 'legal' } })} />
      </View>
    </View>
  );

  if (!user) {
    return (
      <Screen>
        <View style={{ gap: space.xl, paddingTop: space.x3 }}>
          <View style={{ gap: space.sm }}>
            <Text variant="display">Your profile</Text>
            <Text variant="body" tone="muted">
              Sign in to see your campaigns, contributions, saved campaigns and impact. You can keep browsing without an account.
            </Text>
          </View>
          <Button label="Sign in" onPress={() => router.push('/auth')} />
          <Button label="Create an account" variant="secondary" onPress={() => router.push({ pathname: '/auth', params: { mode: 'signup' } })} />
          {helpRows}
        </View>
      </Screen>
    );
  }

  const campaigns = mine.data?.items ?? [];
  const attention = campaigns.filter((c) => c.status === 'changes_requested').length;

  return (
    <Screen>
      <View style={{ gap: space.xl, paddingTop: space.lg }}>
        <View style={styles.head}>
          <View style={[styles.avatar, { backgroundColor: colors.ink }]}>
            <Text variant="title" style={{ color: colors.bg }}>
              {user.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="title">{user.name}</Text>
            <Text variant="caption" tone="muted">
              {user.email} · Joined {shortDate(user.joinedAt)}
            </Text>
          </View>
        </View>

        <View style={[styles.stats, { borderColor: colors.ink }]}>
          <Stat label="Created" value={String(campaigns.length)} />
          <Stat label="Backed" value={String(impact.data?.backed.count ?? 0)} />
          <Stat label="Contributed" value={money(impact.data?.backed.totalContributed ?? 0)} />
        </View>

        <View>
          <Text variant="kicker" tone="muted" style={styles.section}>
            Your activity
          </Text>
          <ListRow
            title="My campaigns"
            subtitle={attention ? `${attention} need${attention === 1 ? 's' : ''} your action` : `${campaigns.length} in total`}
            onPress={() => router.push('/my-campaigns')}
          />
          <ListRow title="My impact" subtitle="Reach, actions and perception shift from your contributions" onPress={() => router.push('/impact')} />
          <ListRow title="Contributions and receipts" onPress={() => router.push('/contributions')} />
          <ListRow title="Saved campaigns" onPress={() => router.push('/saved')} />
        </View>

        <View>
          <Text variant="kicker" tone="muted" style={styles.section}>
            Account
          </Text>
          <ListRow title="Public profile" subtitle="Choose what others can see" onPress={() => router.push('/public-profile')} />
          <ListRow title="Notification settings" onPress={() => router.push('/settings')} />
        </View>

        {helpRows}

        <Button label="Sign out" variant="secondary" onPress={() => void signOut()} />
        <Text variant="caption" tone="muted" align="center">
          Payments in this version are simulated; no real money moves.
        </Text>
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text variant="number">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', borderTopWidth: 2, borderBottomWidth: 1, paddingVertical: space.md },
  section: { marginBottom: space.xs },
});
