import { Tabs } from 'expo-router';
import { Bell, Compass, House, Plus, User } from 'lucide-react-native';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { useNotifications } from '@/api/hooks';
import { fonts, radius, useTheme } from '@/theme';
import { useAuth } from '@/store/auth';

type TabButtonProps = { onPress?: ((e: never) => void) | null; accessibilityState?: { selected?: boolean } };

function CreateButton({ onPress, accessibilityState }: TabButtonProps) {
  const { colors } = useTheme();
  const focused = accessibilityState?.selected;
  return (
    <Pressable onPress={onPress as (() => void) | undefined} accessibilityRole="button" accessibilityLabel="Create a campaign" style={styles.createWrap}>
      <View style={[styles.create, { backgroundColor: colors.action, borderColor: colors.bg }, focused && { transform: [{ scale: 0.96 }] }]}>
        <Plus size={26} color={colors.actionInk} strokeWidth={2} />
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const signedIn = Boolean(useAuth((s) => s.user));
  const unread = useNotifications(signedIn).data?.unread ?? 0;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.rule,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: { fontFamily: fonts.sansSemi, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <House size={22} color={color} strokeWidth={1.75} /> }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore', tabBarIcon: ({ color }) => <Compass size={22} color={color} strokeWidth={1.75} /> }} />
      <Tabs.Screen name="create" options={{ title: '', tabBarButton: (props) => <CreateButton {...props} /> }} />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => (
            <View>
              <Bell size={22} color={color} strokeWidth={1.75} />
              {unread > 0 ? (
                <View style={[styles.badge, { backgroundColor: colors.action }]}>
                  <Text variant="caption" style={{ color: colors.actionInk, fontSize: 10, lineHeight: 12, fontFamily: fonts.sansBold }}>
                    {unread > 9 ? '9+' : unread}
                  </Text>
                </View>
              ) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <User size={22} color={color} strokeWidth={1.75} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  create: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
    borderWidth: 4,
  },
  badge: { position: 'absolute', top: -5, right: -9, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
});
