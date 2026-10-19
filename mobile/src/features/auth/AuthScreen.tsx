import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Eye, EyeOff, X } from 'lucide-react-native';
import { ApiError, errorMessage } from '@/api/client';
import { useConfig } from '@/api/hooks';
import { Button, Field, Screen, Text } from '@/components/ui';
import { useAuth } from '@/store/auth';
import { toast } from '@/store/toast';
import { layout, space, useTheme } from '@/theme';

type Mode = 'signin' | 'signup';

const emailOk = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());

export function AuthScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const cfg = useConfig();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>(params.mode === 'signup' ? 'signup' : 'signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === 'signup' && name.trim().length < 2) e.name = 'Enter your name.';
    if (!emailOk(email)) e.email = 'Enter a valid email address.';
    if (mode === 'signup' ? password.length < 8 : password.length < 1) e.password = mode === 'signup' ? 'Use at least 8 characters.' : 'Enter your password.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (override?: { email: string; password: string }) => {
    setFormError(null);
    if (!override && !validate()) return;
    setBusy(true);
    try {
      if (override) await signIn(override.email, override.password);
      else if (mode === 'signup') await signUp(name.trim(), email.trim(), password);
      else await signIn(email.trim(), password);
      toast.success(mode === 'signup' && !override ? 'Account created. Welcome.' : 'Signed in.');
      close();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
    setFormError(null);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ gap: space.xl }}>
        <View style={styles.top}>
          <Text variant="heading">Campaign</Text>
          <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <X size={24} color={colors.ink} strokeWidth={1.5} />
          </Pressable>
        </View>

        <View style={{ gap: space.sm }}>
          <Text variant="display">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</Text>
          <Text variant="body" tone="muted">
            {mode === 'signup'
              ? 'One account lets you back campaigns, create your own and follow how they do. You can browse without one.'
              : 'Sign in to back campaigns, comment, save and manage your own.'}
          </Text>
        </View>

        <View style={[styles.segment, { borderColor: colors.ink }]} accessibilityRole="tablist">
          {(['signin', 'signup'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => switchMode(m)}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              style={[styles.segmentItem, { backgroundColor: mode === m ? colors.ink : 'transparent' }]}
            >
              <Text variant="label" style={{ color: mode === m ? colors.bg : colors.ink }}>
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ gap: space.lg }}>
          {mode === 'signup' ? (
            <Field label="Your name" required value={name} onChangeText={setName} error={errors.name} autoCapitalize="words" autoComplete="name" textContentType="name" />
          ) : null}
          <Field
            label="Email"
            required
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
          />
          <View>
            <Field
              label="Password"
              required
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              textContentType={mode === 'signup' ? 'newPassword' : 'password'}
              hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
              onSubmitEditing={() => submit()}
              returnKeyType="go"
            />
            <Pressable onPress={() => setShow((v) => !v)} accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'} style={styles.eye} hitSlop={8}>
              {show ? <EyeOff size={20} color={colors.inkMuted} strokeWidth={1.5} /> : <Eye size={20} color={colors.inkMuted} strokeWidth={1.5} />}
            </Pressable>
          </View>
        </View>

        {formError ? (
          <View style={[styles.error, { borderColor: colors.danger, backgroundColor: colors.dangerSoft }]} accessibilityRole="alert">
            <Text variant="bodySm" tone="danger">
              {formError}
            </Text>
          </View>
        ) : null}

        <Button label={mode === 'signup' ? 'Create account' : 'Sign in'} onPress={() => submit()} loading={busy} />
        <Button label="Keep browsing" variant="ghost" onPress={close} />

      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 52 },
  segment: { flexDirection: 'row', borderWidth: 1.5, borderRadius: 6, overflow: 'hidden', maxWidth: layout.maxContent },
  segmentItem: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  eye: { position: 'absolute', right: 14, top: 34, height: 44, justifyContent: 'center' },
  error: { borderLeftWidth: 3, padding: space.md },
});
