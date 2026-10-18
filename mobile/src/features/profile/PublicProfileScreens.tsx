import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { CampaignCard } from '@/components/campaign/CampaignCard';
import { Button, EmptyState, ErrorState, Field, Screen, ScreenHeader, Skeleton, Text } from '@/components/ui';
import { compact, money, shortDate } from '@/lib/format';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { fonts, space, useTheme } from '@/theme';
import type { CampaignCard as Card } from '@/types/api';

type Profile = {
  visibility: 'public' | 'unlisted' | 'private';
  displayName: string;
  bio: string;
  location: string;
  show: { totalReach: boolean; moneyRaised: boolean; amplified: boolean; contributed: boolean; avgTrust: boolean };
  hideCreated: boolean;
  hideBacked: boolean;
};

const visibilityOptions = [
  { value: 'public', title: 'Public', note: 'Anyone can find and view it.' },
  { value: 'unlisted', title: 'Unlisted', note: 'Only people with the link can view it.' },
  { value: 'private', title: 'Private', note: 'Only you. Hidden from everyone else.' },
] as const;

const showOptions: { key: keyof Profile['show']; label: string }[] = [
  { key: 'totalReach', label: 'Total reach' },
  { key: 'moneyRaised', label: 'Money raised' },
  { key: 'amplified', label: 'Amplified campaigns' },
  { key: 'contributed', label: 'Contributed as a backer' },
];

export function PublicProfileEditor() {
  const router = useRouter();
  const { colors } = useTheme();
  const qc = useQueryClient();
  const user = useAuth((s) => s.user);
  const q = useQuery({ queryKey: ['profile'], queryFn: () => api<{ profile: Profile; slug: string }>('/me/profile'), enabled: Boolean(user) });
  const [p, setP] = useState<Profile | null>(null);

  useEffect(() => {
    if (q.data && !p) setP(q.data.profile);
  }, [q.data, p]);

  const save = useMutation({
    mutationFn: () => api('/me/profile', { method: 'PUT', body: p }),
    onSuccess: () => {
      toast.success('Public profile saved.');
      void qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!user) {
    return (
      <Screen>
        <ScreenHeader title="Public profile" />
        <EmptyState title="Sign in first" message="Your public profile belongs to your account." actionLabel="Sign in" onAction={() => router.push('/auth')} />
      </Screen>
    );
  }
  if (q.isError) {
    return (
      <Screen>
        <ScreenHeader title="Public profile" />
        <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  if (!p) {
    return (
      <Screen>
        <ScreenHeader title="Public profile" />
        <Skeleton height={200} />
      </Screen>
    );
  }

  const set = (patch: Partial<Profile>) => setP({ ...p, ...patch });

  return (
    <Screen>
      <ScreenHeader title="Public profile" />
      <View style={{ gap: space.xl }}>
        <Text variant="body" tone="muted">
          This is the page people see at /u/{q.data?.slug}. Choose who can see it and what it shows.
        </Text>

        <View style={{ gap: space.sm }}>
          <Text variant="label">Who can see your profile</Text>
          {visibilityOptions.map((o) => (
            <Pressable
              key={o.value}
              onPress={() => set({ visibility: o.value })}
              accessibilityRole="radio"
              accessibilityState={{ selected: p.visibility === o.value }}
              style={[styles.radio, { borderColor: p.visibility === o.value ? colors.ink : colors.rule, backgroundColor: colors.surface }]}
            >
              <View style={[styles.dot, { borderColor: colors.ink, backgroundColor: p.visibility === o.value ? colors.ink : 'transparent' }]} />
              <View style={{ flex: 1 }}>
                <Text variant="label">{o.title}</Text>
                <Text variant="caption" tone="muted">
                  {o.note}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Field label="Display name" value={p.displayName} onChangeText={(t) => set({ displayName: t })} maxLength={60} hint="Optional. Defaults to your name." />
        <Field label="Bio" value={p.bio} onChangeText={(t) => set({ bio: t })} multiline minHeight={90} maxLength={500} showCounter hint="Links are removed automatically." />
        <Field label="Location" value={p.location} onChangeText={(t) => set({ location: t })} maxLength={80} />

        <View style={{ gap: space.sm }}>
          <Text variant="label">What to show</Text>
          {showOptions.map((o) => (
            <View key={o.key} style={[styles.toggle, { borderColor: colors.rule }]}>
              <Text variant="body" style={{ flex: 1 }}>
                {o.label}
              </Text>
              <Switch value={p.show[o.key]} onValueChange={(v) => set({ show: { ...p.show, [o.key]: v } })} trackColor={{ true: colors.positive, false: colors.rule }} thumbColor="#FFFFFF" accessibilityLabel={o.label} />
            </View>
          ))}
          <View style={[styles.toggle, { borderColor: colors.rule }]}>
            <Text variant="body" style={{ flex: 1 }}>
              Hide campaigns I created
            </Text>
            <Switch value={p.hideCreated} onValueChange={(v) => set({ hideCreated: v })} trackColor={{ true: colors.positive, false: colors.rule }} thumbColor="#FFFFFF" accessibilityLabel="Hide campaigns I created" />
          </View>
          <View style={[styles.toggle, { borderColor: colors.rule }]}>
            <Text variant="body" style={{ flex: 1 }}>
              Hide campaigns I backed
            </Text>
            <Switch value={p.hideBacked} onValueChange={(v) => set({ hideBacked: v })} trackColor={{ true: colors.positive, false: colors.rule }} thumbColor="#FFFFFF" accessibilityLabel="Hide campaigns I backed" />
          </View>
        </View>

        <Button label="Save public profile" onPress={() => save.mutate()} loading={save.isPending} />
        <Button label="View my public page" variant="secondary" disabled={p.visibility === 'private'} onPress={() => router.push({ pathname: '/u/[slug]', params: { slug: q.data!.slug } })} />
      </View>
    </Screen>
  );
}

type Public = {
  name: string;
  bio: string;
  location: string;
  joinedAt: string;
  unlisted: boolean;
  stats: { totalReach?: number; moneyRaised?: number; amplifiedCampaigns?: number; contributed?: number };
  created: Card[];
  backed: Card[];
};

export function PublicProfileView() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const q = useQuery({ queryKey: ['u', slug], queryFn: () => api<Public>(`/u/${slug}`), enabled: Boolean(slug) });

  if (q.isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Profile" />
        <Skeleton height={120} />
      </Screen>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Screen>
        <ScreenHeader title="Profile" />
        <ErrorState title="Profile not available" message={errorMessage(q.error)} onRetry={() => q.refetch()} />
      </Screen>
    );
  }
  const d = q.data;
  const stats = [
    d.stats.totalReach != null ? { label: 'Total reach (est.)', value: compact(d.stats.totalReach) } : null,
    d.stats.moneyRaised != null ? { label: 'Money raised', value: money(d.stats.moneyRaised) } : null,
    d.stats.amplifiedCampaigns != null ? { label: 'Campaigns', value: String(d.stats.amplifiedCampaigns) } : null,
    d.stats.contributed != null ? { label: 'Contributed', value: money(d.stats.contributed) } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <Screen>
      <ScreenHeader title="Profile" />
      <View style={{ gap: space.xl }}>
        <View style={{ gap: space.sm }}>
          <Text variant="display">{d.name}</Text>
          <Text variant="caption" tone="muted">
            {d.location ? `${d.location} · ` : ''}Joined {shortDate(d.joinedAt)}
            {d.unlisted ? ' · Unlisted' : ''}
          </Text>
          {d.bio ? <Text variant="body">{d.bio}</Text> : null}
        </View>
        {stats.length > 0 ? (
          <View style={styles.stats}>
            {stats.map((s) => (
              <View key={s.label} style={{ width: '50%', paddingVertical: space.sm, gap: 2 }}>
                <Text variant="number" style={{ fontFamily: fonts.serifSemi }}>
                  {s.value}
                </Text>
                <Text variant="caption" tone="muted">
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        {d.created.length > 0 ? (
          <View style={{ gap: space.md }}>
            <Text variant="title">Campaigns</Text>
            {d.created.map((c) => (
              <CampaignCard key={c.id} campaign={c} compact />
            ))}
          </View>
        ) : null}
        {d.backed.length > 0 ? (
          <View style={{ gap: space.md }}>
            <Text variant="title">Backed</Text>
            {d.backed.map((c) => (
              <CampaignCard key={c.id} campaign={c} compact />
            ))}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  radio: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderWidth: 1.5, padding: space.md, minHeight: 60 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 52, borderBottomWidth: 1 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 2 },
});
