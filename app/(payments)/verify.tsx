import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppColors } from '@/hooks/use-app-colors';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/design-system';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';

export default function VerifyPayment() {
  const routeTxRef = undefined;
  const routePlanId = undefined;
  const router = useRouter();
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C.scheme]);
  const [txRef, setTxRef] = useState(routeTxRef || '');
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);

  const getToken = async () => {
    if (typeof window !== 'undefined') return localStorage.getItem('userToken');
    return await SecureStore.getItemAsync('userToken');
  };

  useEffect(() => {
    // Parse web query params as a fallback when available
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const sp = new URLSearchParams(window.location.search);
        const t = sp.get('tx_ref') || sp.get('txref') || sp.get('txRef');
        const p = sp.get('plan_id') || sp.get('planId') || sp.get('plan');
        if (t) setTxRef(t);
        if (p) {
          // will be sent automatically during verify if present
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const verify = async () => {
    if (!txRef && !transactionId) return Alert.alert('Error', 'Provide tx_ref or transaction id');
    setLoading(true);
    try {
      const token = await getToken();
      const body: any = {};
      if (transactionId) body.transaction_id = transactionId;
      if (txRef) body.tx_ref = txRef;
      if (routePlanId) body.plan_id = Number(routePlanId);

      const res = await fetch(`${API_BASE_URL}/api/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed');

      Alert.alert('Success', 'Subscription activated');
      router.push('/(student)/dashboard');
    } catch (err: any) {
      Alert.alert('Verification Error', err.message || 'Could not verify payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Verify Payment</ThemedText>

      <ThemedText style={styles.label}>Transaction Reference (tx_ref)</ThemedText>
      <TextInput 
        value={txRef} 
        onChangeText={setTxRef} 
        placeholder="tx_ref" 
        placeholderTextColor={C.textMuted}
        style={styles.input} 
      />

      <ThemedText style={styles.label}>Transaction ID (optional)</ThemedText>
      <TextInput 
        value={transactionId} 
        onChangeText={setTransactionId} 
        placeholder="transaction id" 
        placeholderTextColor={C.textMuted}
        style={styles.input} 
      />

      <TouchableOpacity onPress={verify} disabled={loading} style={styles.button}>
        {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>VERIFY PAYMENT</ThemedText>}
      </TouchableOpacity>
    </ThemedView>
  );
}

function makeStyles(C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>) {
  return StyleSheet.create({
    container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: C.background },
    title: { fontSize: 24, fontWeight: '900', color: C.text, marginBottom: 24 },
    label: { fontSize: 12, fontWeight: '800', color: C.textLabel, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    input: { padding: 16, backgroundColor: C.inputBg, color: C.inputText, borderWidth: 1, borderColor: C.inputBorder, borderRadius: 16, marginBottom: 20, fontSize: 16, fontWeight: '600' },
    button: { backgroundColor: '#10B981', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
    buttonText: { color: '#fff', fontWeight: '800', letterSpacing: 1 }
  });
}
