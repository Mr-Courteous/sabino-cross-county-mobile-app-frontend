import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { CustomAlert } from '@/components/custom-alert';
import { useAppColors } from '@/hooks/use-app-colors';
import { API_BASE_URL, saveParentSession } from '@/utils/parent-session';
import { Field, PrimaryButton, ScreenHeader } from '@/components/parent-ui';

type Step = 'details' | 'code' | 'password';

export default function ParentRegister() {
  const router = useRouter();
  const C = useAppColors();
  const [step, setStep] = useState<Step>('details');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error' | 'success' | 'info'; title: string; message: string } | null>(null);

  const post = async (path: string, body: any) => {
    const res = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.success === false) throw Object.assign(new Error(json.error || 'Something went wrong.'), { json });
    return json;
  };
  const fail = (e: any) => setAlert({ type: 'error', title: 'Cannot continue', message: e?.message || 'Check your connection and try again.' });

  const sendCode = async () => {
    if (fullName.trim().length < 2) return setAlert({ type: 'error', title: 'Your name', message: 'Enter your full name.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setAlert({ type: 'error', title: 'Email', message: 'Enter a valid email address.' });
    try {
      setLoading(true);
      await post('/api/parents/otp', { email: email.trim() });
      setStep('code');
      setAlert({ type: 'info', title: 'Check your email', message: `We sent a 6-digit code to ${email.trim()}.` });
    } catch (e: any) {
      if (e?.json?.alreadyRegistered) {
        setAlert({ type: 'info', title: 'Already registered', message: 'This email already has a parent account. Please log in.' });
      } else fail(e);
    } finally { setLoading(false); }
  };

  const verify = async () => {
    try {
      setLoading(true);
      await post('/api/parents/verify-otp', { email: email.trim(), otp: code.trim() });
      setStep('password');
    } catch (e) { fail(e); } finally { setLoading(false); }
  };

  const create = async () => {
    if (password !== confirm) return setAlert({ type: 'error', title: 'Passwords differ', message: 'The two passwords do not match.' });
    try {
      setLoading(true);
      const json = await post('/api/parents/register', { fullName: fullName.trim(), email: email.trim(), phone: phone.trim(), password });
      await saveParentSession(json.data.token, json.data.parent);
      router.replace('/(parent)/dashboard' as any);
    } catch (e) { fail(e); } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader C={C} title="Create parent account" onBack={() => (step === 'details' ? router.back() : setStep(step === 'password' ? 'code' : 'details'))} />
      <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 440 }}>
          <ThemedText style={{ fontSize: 11, fontWeight: '900', letterSpacing: 1.5, color: '#2563EB', marginBottom: 14 }}>
            STEP {step === 'details' ? 1 : step === 'code' ? 2 : 3} OF 3
          </ThemedText>

          {step === 'details' && (
            <>
              <Field C={C} label="FULL NAME" value={fullName} onChangeText={setFullName} placeholder="e.g. Mrs Ngozi Obi" />
              <Field C={C} label="EMAIL" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
              <Field C={C} label="PHONE (OPTIONAL)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="080..." />
              <PrimaryButton C={C} title="SEND VERIFICATION CODE" onPress={sendCode} loading={loading} />
            </>
          )}

          {step === 'code' && (
            <>
              <ThemedText style={{ fontSize: 13, color: C.textSecondary, marginBottom: 16, lineHeight: 19 }}>Enter the 6-digit code we emailed to {email.trim()}.</ThemedText>
              <Field C={C} label="CODE" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="123456" />
              <PrimaryButton C={C} title="VERIFY" onPress={verify} loading={loading} disabled={code.trim().length < 6} />
              <View style={{ height: 12 }} />
              <PrimaryButton C={C} outline title="SEND A NEW CODE" onPress={sendCode} loading={loading} />
            </>
          )}

          {step === 'password' && (
            <>
              <ThemedText style={{ fontSize: 12, color: C.textSecondary, marginBottom: 14, lineHeight: 18 }}>
                At least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol.
              </ThemedText>
              <Field C={C} label="PASSWORD" value={password} onChangeText={setPassword} secureTextEntry placeholder="Create a password" />
              <Field C={C} label="CONFIRM PASSWORD" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repeat the password" />
              <PrimaryButton C={C} title="CREATE ACCOUNT" onPress={create} loading={loading} />
            </>
          )}
        </View>
      </ScrollView>
      {alert && <CustomAlert type={alert.type} title={alert.title} message={alert.message} onClose={() => setAlert(null)} />}
    </KeyboardAvoidingView>
  );
}
