import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { api, errorMessage } from '@/api/client';
import { Button, EmptyState, Field, Screen, ScreenHeader, Text } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { space, useTheme } from '@/theme';
import type { AppUser } from '@/types/api';

const categories: { key: keyof AppUser['notificationPrefs']; title: string; note: string }[] = [
  { key: 'campaigns', title: 'Campaign review', note: 'Submission received, approved, changes requested or not approved.' },
  { key: 'funding', title: 'Funding milestones', note: 'Open for backing, milestones reached, goal reached and distribution steps.' },
  { key: 'backing', title: 'Your contributions', note: 'Payment confirmations and problems.' },
  { key: 'reports', title: 'Reports and updates', note: 'Promotion started, delivery progress and final reports.' },
  { key: 'account', title: 'Account security', note: 'Always on. Important notices about your account.' },
];

export function SettingsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const user = useAuth((s) => s.user);
  const setUser = useAuth((s) => s.setUser);
  const [name, setName] = useState(user?.name ?? '');

  const save = useMutation({
    mutationFn: (body: Partial<Pick<AppUser, 'name' | 'notificationPrefs'>>) => api<{ user: AppUser }>('/auth/me', { method: 'PATCH', body }),
    onSuccess: (r) => {
      setUser(r.user);
      toast.success('Saved.');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!user) {
    return (
      <Screen>
        <ScreenHeader title="Settings" />
        <EmptyState title="Sign in to change settings" message="Settings belong to your account." actionLabel="Sign in" onAction={() => router.push('/auth')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="Settings" />
      <View style={{ gap: space.xl }}>
        <View style={{ gap: space.md }}>
          <Text variant="title">Account</Text>
          <Field label="Name" value={name} onChangeText={setName} maxLength={60} />
          <Field label="Email" value={user.email} editable={false} hint="Your email cannot be changed in this prototype." />
          <Button label="Save name" variant="dark" size="sm" disabled={name.trim().length < 2 || name.trim() === user.name} loading={save.isPending} onPress={() => save.mutate({ name: name.trim() })} fullWidth={false} />
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="title">Notifications</Text>
          <Text variant="bodySm" tone="muted">
            In-app notifications only. We skip repeats so you hear about what matters.
          </Text>
          {categories.map((c) => (
            <View key={c.key} style={[styles.row, { borderColor: colors.rule }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="label">{c.title}</Text>
                <Text variant="caption" tone="muted">
                  {c.note}
                </Text>
              </View>
              <Switch
                value={c.key === 'account' ? true : user.notificationPrefs[c.key]}
                disabled={c.key === 'account'}
                onValueChange={(v) => save.mutate({ notificationPrefs: { ...user.notificationPrefs, [c.key]: v } })}
                trackColor={{ true: colors.positive, false: colors.rule }}
                thumbColor="#FFFFFF"
                accessibilityLabel={c.title}
              />
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: space.lg, minHeight: 64, borderBottomWidth: 1, paddingVertical: space.sm } });
