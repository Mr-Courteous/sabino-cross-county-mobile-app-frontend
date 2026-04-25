import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Linking, Alert, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppColors } from '@/hooks/use-app-colors';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/design-system';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';

export default function InitiatePayment() {
  const routePlanId = undefined; // fallback; we'll parse web query params below
  const router = useRouter();
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C.scheme]);
  const [planId, setPlanId] = useState(routePlanId || '');
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState('');
  const [txRef, setTxRef] = useState('');

  const getToken = async () => {
    if (typeof window !== 'undefined') return localStorage.getItem('userToken');
    return await SecureStore.getItemAsync('userToken');
  };

  useEffect(() => {
    // If opened on web with ?planId=..., prefer that value
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search);
        const p = sp.get('planId') || sp.get('plan_id') || sp.get('plan');
        if (p) setPlanId(p);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const initiate = async () => {
    if (!planId) return Alert.alert('Error', 'Please provide plan id');
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan_id: Number(planId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to initiate');
      setLink(data.link);
      setTxRef(data.tx_ref);

      if (data.link) {
        // Open hosted payment
        Linking.openURL(data.link);
      }
    } catch (err: any) {
      Alert.alert('Payment Error', err.message || 'Could not initiate payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Initiate Payment</ThemedText>

      <ThemedText style={styles.label}>Plan ID</ThemedText>
      <TextInput
        value={String(planId)}
        onChangeText={setPlanId}
        placeholder="Plan ID"
        placeholderTextColor={C.textMuted}
        keyboardType="numeric"
        style={styles.input}
      />

      <TouchableOpacity onPress={initiate} disabled={loading} style={styles.button}>
        {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>GET PAYMENT LINK</ThemedText>}
      </TouchableOpacity>

      {txRef ? (
        <View style={{ marginTop: 16 }}>
          <ThemedText style={styles.txRef}>Tx Ref: {txRef}</ThemedText>
          <TouchableOpacity onPress={() => router.push({ pathname: '/(payments)/verify', params: { tx_ref: txRef, plan_id: planId } } as any)} style={{ marginTop: 12 }}>
            <ThemedText style={styles.verifyLink}>Verify Payment</ThemedText>
          </TouchableOpacity>
        </View>
      ) : null}

    </ThemedView>
  );
}

function makeStyles(C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>) {
  return StyleSheet.create({
    container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: C.background },
    title: { fontSize: 24, fontWeight: '900', color: C.text, marginBottom: 24 },
    label: { fontSize: 12, fontWeight: '800', color: C.textLabel, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    input: { padding: 16, backgroundColor: C.inputBg, color: C.inputText, borderWidth: 1, borderColor: C.inputBorder, borderRadius: 16, marginBottom: 20, fontSize: 16, fontWeight: '600' },
    button: { backgroundColor: Colors.accent.navy, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
    buttonText: { color: '#fff', fontWeight: '800', letterSpacing: 1 },
    txRef: { fontSize: 12, color: C.textSecondary, fontWeight: '600' },
    verifyLink: { color: Colors.accent.gold, fontWeight: '800', fontSize: 14 }
  });
}
