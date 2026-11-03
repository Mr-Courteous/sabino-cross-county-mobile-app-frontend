import { View, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, useWindowDimensions } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { CustomAlert } from '@/components/custom-alert';
import { useAppColors } from '@/hooks/use-app-colors';
import { API_BASE_URL, getParentToken, saveParentSession } from '@/utils/parent-session';
import { Field, PrimaryButton, ScreenHeader } from '@/components/parent-ui';

export default function ParentLogin() {
  const router = useRouter();
  const C = useAppColors();
  const { width } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ title: string; message: string } | null>(null);

  // Already logged in as a parent? Go straight to the dashboard.
  useEffect(() => {
    getParentToken().then((t) => { if (t) router.replace('/(parent)/dashboard' as any); });
  }, []);

  const login = async () => {
    if (!email.trim() || !password) { setAlert({ title: 'Missing details', message: 'Enter your email and password.' }); return; }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/parents/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) throw new Error(json.error || 'Login failed.');
      await saveParentSession(json.data.token, json.data.parent);
      router.replace('/(parent)/dashboard' as any);
    } catch (e: any) {
      setAlert({ title: 'Cannot log in', message: e?.message || 'Check your connection and try again.' });
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader C={C} title="Parents' Login" onBack={() => (router.canGoBack() ? router.back() : router.replace('/' as any))} />
      <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 440, marginTop: 10 }}>
          <ThemedText style={{ fontSize: 22, fontWeight: '900', color: C.text, marginBottom: 6 }}>Welcome</ThemedText>
          <ThemedText style={{ fontSize: 13, color: C.textSecondary, marginBottom: 22, lineHeight: 19 }}>
            See all your children's scores, report cards and attendance in one place.
          </ThemedText>

          <Field C={C} label="EMAIL" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
          <Field C={C} label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" onSubmitEditing={login} />

          <PrimaryButton C={C} title="LOG IN" onPress={login} loading={loading} />

          <TouchableOpacity onPress={() => router.push('/(parent)/forgot-password' as any)} style={{ alignItems: 'center', marginTop: 16 }}>
            <ThemedText style={{ color: '#2563EB', fontWeight: '700', fontSize: 12 }}>Forgot password?</ThemedText>
          </TouchableOpacity>

          <View style={{ height: 1, backgroundColor: C.divider, marginVertical: 22 }} />
          <ThemedText style={{ fontSize: 12, color: C.textSecondary, textAlign: 'center', marginBottom: 10 }}>New here?</ThemedText>
          <PrimaryButton C={C} outline title="CREATE A PARENT ACCOUNT" onPress={() => router.push('/(parent)/register' as any)} />
        </View>
      </ScrollView>
      {alert && <CustomAlert type="error" title={alert.title} message={alert.message} onClose={() => setAlert(null)} />}
    </KeyboardAvoidingView>
  );
}
