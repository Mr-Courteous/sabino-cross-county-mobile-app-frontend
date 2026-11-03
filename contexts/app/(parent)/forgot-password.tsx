import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { CustomAlert } from '@/components/custom-alert';
import { useAppColors } from '@/hooks/use-app-colors';
import { API_BASE_URL } from '@/utils/parent-session';
import { Field, PrimaryButton, ScreenHeader } from '@/components/parent-ui';

export default function ParentForgotPassword() {
  const router = useRouter();
  const C = useAppColors();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error' | 'success' | 'info'; title: string; message: string; done?: boolean } | null>(null);

  const post = async (path: string, body: any) => {
    const res = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw new Error(json.error || 'Something went wrong.');
    return json;
  };

  const requestCode = async () => {
    try {
      setLoading(true);
      await post('/api/parents/forgot-password', { email: email.trim() });
      setSent(true);
      setAlert({ type: 'info', title: 'Check your email', message: 'If that email has an account, a reset code is on its way.' });
    } catch (e: any) { setAlert({ type: 'error', title: 'Error', message: e.message }); } finally { setLoading(false); }
  };

  const reset = async () => {
    try {
      setLoading(true);
      await post('/api/parents/reset-password', { email: email.trim(), otp: code.trim(), newPassword: password });
      setAlert({ type: 'success', title: 'Password updated', message: 'You can now log in with your new password.', done: true });
    } catch (e: any) { setAlert({ type: 'error', title: 'Cannot reset', message: e.message }); } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader C={C} title="Reset password" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 440 }}>
          <Field C={C} label="EMAIL" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" editable={!sent} />
          {!sent ? (
            <PrimaryButton C={C} title="SEND RESET CODE" onPress={requestCode} loading={loading} disabled={!email.trim()} />
          ) : (
            <>
              <Field C={C} label="CODE FROM EMAIL" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="123456" />
              <Field C={C} label="NEW PASSWORD" value={password} onChangeText={setPassword} secureTextEntry placeholder="New password" />
              <ThemedText style={{ fontSize: 11, color: C.textSecondary, marginBottom: 14 }}>8+ characters with upper and lower case, a number and a symbol.</ThemedText>
              <PrimaryButton C={C} title="UPDATE PASSWORD" onPress={reset} loading={loading} disabled={code.trim().length < 6 || !password} />
            </>
          )}
        </View>
      </ScrollView>
      {alert && (
        <CustomAlert type={alert.type} title={alert.title} message={alert.message}
          onClose={() => { const done = alert.done; setAlert(null); if (done) router.replace('/(parent)' as any); }} />
      )}
    </KeyboardAvoidingView>
  );
}
