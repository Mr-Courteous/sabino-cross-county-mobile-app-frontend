import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
  Share,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';
import { Colors } from '@/constants/design-system';
import { CustomInput } from '@/components/custom-input';
import { CustomButton } from '@/components/custom-button';
import { CustomAlert } from '@/components/custom-alert';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppColors } from '@/hooks/use-app-colors';

type ResultState =
  | { kind: 'credentials'; fullName: string; email: string; tempPassword: string }
  | { kind: 'invite'; fullName: string; email: string; code: string; expiresAt: string }
  | null;

export default function AddStaffPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C, width), [C.scheme, width]);
  const isTiny = width < 300;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [savingPath, setSavingPath] = useState<'A' | 'B' | null>(null);
  const [result, setResult] = useState<ResultState>(null);
  const [alert, setAlert] = useState<{ visible: boolean; type: 'success' | 'error'; message: string }>({
    visible: false,
    type: 'success',
    message: '',
  });

  const getToken = async () => {
    return Platform.OS !== 'web' ? await SecureStore.getItemAsync('userToken') : localStorage.getItem('userToken');
  };

  const validate = () => {
    if (!fullName.trim()) {
      setAlert({ visible: true, type: 'error', message: 'Full name is required.' });
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setAlert({ visible: true, type: 'error', message: 'A valid email is required.' });
      return false;
    }
    return true;
  };

  // Path A — register the account immediately with a temp password.
  const handleRegisterNow = async () => {
    if (!validate()) return;
    setSavingPath('A');
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/staff/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || undefined }),
      });

      if (res.status === 402) { router.replace('/pricing'); return; }
      if (res.status === 403) {
        setAlert({ visible: true, type: 'error', message: 'Only the school owner can add staff accounts.' });
        return;
      }

      const data = await res.json();
      if (data.success) {
        setResult({
          kind: 'credentials',
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          tempPassword: data.data.temporaryPassword,
        });
      } else {
        setAlert({ visible: true, type: 'error', message: data.error || 'Failed to create the account.' });
      }
    } catch (e) {
      setAlert({ visible: true, type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSavingPath(null);
    }
  };

  // Path B — generate a self-registration code.
  const handleSendCode = async () => {
    if (!validate()) return;
    setSavingPath('B');
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/staff/admins/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fullName: fullName.trim(), email: email.trim().toLowerCase(), phone: phone.trim() || undefined }),
      });

      if (res.status === 402) { router.replace('/pricing'); return; }
      if (res.status === 403) {
        setAlert({ visible: true, type: 'error', message: 'Only the school owner can invite staff.' });
        return;
      }

      const data = await res.json();
      if (data.success) {
        setResult({
          kind: 'invite',
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          code: data.data.code,
          expiresAt: data.data.expires_at,
        });
      } else {
        setAlert({ visible: true, type: 'error', message: data.error || 'Failed to generate an invite code.' });
      }
    } catch (e) {
      setAlert({ visible: true, type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSavingPath(null);
    }
  };

  const shareCredentials = () => {
    if (result?.kind !== 'credentials') return;
    Share.share({
      message: `You've been added as an admin on Sabino Edu.\n\nEmail: ${result.email}\nTemporary password: ${result.tempPassword}\n\nYou'll be asked to set your own password on first login.`,
    });
  };

  const shareCode = () => {
    if (result?.kind !== 'invite') return;
    Share.share({
      message: `You're invited to join Sabino Edu as an admin.\n\nOpen the app, choose "Register with a code", and enter: ${result.code}\n\nThis code expires ${new Date(result.expiresAt).toLocaleString()}.`,
    });
  };

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setResult(null);
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style={C.isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={isTiny ? 18 : 22} color={C.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Add Staff</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {result ? (
          <View style={styles.resultCard}>
            <View style={styles.resultIconWrap}>
              <Ionicons name="checkmark-circle" size={32} color="#22C55E" />
            </View>
            <ThemedText style={styles.resultTitle}>
              {result.kind === 'credentials' ? 'Account created' : 'Invite code generated'}
            </ThemedText>
            <ThemedText style={styles.resultSub}>
              {result.kind === 'credentials'
                ? `${result.fullName} can log in now with the details below. They'll be asked to set their own password on first login. These credentials were also emailed to ${result.email}.`
                : `Share this code with ${result.fullName || result.email}. It also went to ${result.email} by email.`}
            </ThemedText>

            {result.kind === 'credentials' ? (
              <View style={styles.credBox}>
                <View style={styles.credRow}>
                  <ThemedText style={styles.credLabel}>EMAIL</ThemedText>
                  <ThemedText style={styles.credValue} selectable>{result.email}</ThemedText>
                </View>
                <View style={styles.credRow}>
                  <ThemedText style={styles.credLabel}>TEMP PASSWORD</ThemedText>
                  <ThemedText style={styles.credValue} selectable>{result.tempPassword}</ThemedText>
                </View>
              </View>
            ) : (
              <View style={styles.credBox}>
                <ThemedText style={styles.credLabel}>INVITE CODE</ThemedText>
                <ThemedText style={styles.codeValue} selectable>{result.code}</ThemedText>
                <ThemedText style={styles.credSub}>Expires {new Date(result.expiresAt).toLocaleString()}</ThemedText>
              </View>
            )}

            <CustomButton
              title={result.kind === 'credentials' ? 'Share Credentials' : 'Share Code'}
              onPress={result.kind === 'credentials' ? shareCredentials : shareCode}
              variant="premium"
              icon={<Ionicons name="share-social-outline" size={16} color="#0F172A" style={{ marginRight: 6 }} />}
              style={{ marginTop: 8 }}
            />
            <TouchableOpacity onPress={resetForm} style={styles.addAnotherBtn}>
              <ThemedText style={styles.addAnotherText}>+ Add another staff member</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={styles.doneBtn}>
              <ThemedText style={styles.doneText}>Done</ThemedText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ThemedText style={styles.sectionLabel}>STAFF DETAILS</ThemedText>
            <CustomInput
              label="Full Name"
              placeholder="e.g. Jane Adeyemi"
              value={fullName}
              onChangeText={setFullName}
            />
            <CustomInput
              label="Email"
              placeholder="e.g. jane@school.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <CustomInput
              label="Phone (optional)"
              placeholder="e.g. 08012345678"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <ThemedText style={[styles.sectionLabel, { marginTop: 8 }]}>HOW WOULD YOU LIKE TO ADD THEM?</ThemedText>

            <View style={styles.optionCard}>
              <View style={styles.optionIconWrap}>
                <Ionicons name="person-add-outline" size={20} color={Colors.accent.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.optionTitle}>Register for them now</ThemedText>
                <ThemedText style={styles.optionSub}>Creates the login immediately with a temporary password.</ThemedText>
              </View>
            </View>
            <CustomButton
              title="Register Now"
              onPress={handleRegisterNow}
              loading={savingPath === 'A'}
              disabled={savingPath !== null}
              variant="premium"
              style={{ marginBottom: 20 }}
            />

            <View style={styles.optionCard}>
              <View style={styles.optionIconWrap}>
                <Ionicons name="mail-outline" size={20} color={Colors.accent.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.optionTitle}>Send a registration code</ThemedText>
                <ThemedText style={styles.optionSub}>They complete their own profile and set their own password.</ThemedText>
              </View>
            </View>
            <CustomButton
              title="Send Invite Code"
              onPress={handleSendCode}
              loading={savingPath === 'B'}
              disabled={savingPath !== null}
              variant="outline"
            />
          </>
        )}
      </ScrollView>

      {alert.visible && (
        <CustomAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ ...alert, visible: false })}
        />
      )}
    </ThemedView>
  );
}

function makeStyles(C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>, width: number) {
  const isTiny = width < 300;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: isTiny ? 15 : 20, paddingBottom: 16, backgroundColor: C.modalBg, borderBottomWidth: 1, borderColor: C.divider },
    backBtn: { width: isTiny ? 36 : 40, height: isTiny ? 36 : 40, borderRadius: 12, backgroundColor: C.actionItemBg, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: C.text, fontSize: isTiny ? 14 : 16, fontWeight: '800' },

    scrollContent: { padding: isTiny ? 16 : 22, paddingBottom: 60 },

    sectionLabel: { color: C.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 14 },

    optionCard: { flexDirection: 'row', gap: 12, backgroundColor: C.actionItemBg, borderRadius: 16, borderWidth: 1, borderColor: C.actionItemBorder, padding: 14, marginBottom: 10 },
    optionIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: `${Colors.accent.gold}15`, justifyContent: 'center', alignItems: 'center' },
    optionTitle: { color: C.text, fontSize: 13, fontWeight: '800' },
    optionSub: { color: C.textMuted, fontSize: 10.5, marginTop: 3, lineHeight: 14 },

    resultCard: { backgroundColor: C.actionItemBg, borderRadius: 20, borderWidth: 1, borderColor: C.actionItemBorder, padding: 20, alignItems: 'center' },
    resultIconWrap: { marginBottom: 12 },
    resultTitle: { color: C.text, fontSize: 16, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
    resultSub: { color: C.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 17, marginBottom: 18 },

    credBox: { width: '100%', backgroundColor: C.inputBg, borderRadius: 14, borderWidth: 1, borderColor: C.inputBorder, padding: 14, marginBottom: 16 },
    credRow: { marginBottom: 10 },
    credLabel: { color: C.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
    credValue: { color: C.text, fontSize: 13, fontWeight: '700' },
    codeValue: { color: Colors.accent.gold, fontSize: 26, fontWeight: '900', letterSpacing: 4, textAlign: 'center', marginVertical: 8 },
    credSub: { color: C.textMuted, fontSize: 10, textAlign: 'center' },

    addAnotherBtn: { marginTop: 14 },
    addAnotherText: { color: Colors.accent.gold, fontSize: 12, fontWeight: '700' },
    doneBtn: { marginTop: 10 },
    doneText: { color: C.textMuted, fontSize: 12, fontWeight: '600' },
  });
}
