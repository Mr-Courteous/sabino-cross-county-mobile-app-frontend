import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';

export default function VerifyPayment() {
  const routeTxRef = undefined;
  const routePlanId = undefined;
  const router = useRouter();
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
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Verify Payment</Text>

      <Text style={{ marginBottom: 6 }}>Transaction Reference (tx_ref)</Text>
      <TextInput value={txRef} onChangeText={setTxRef} placeholder="tx_ref" style={{ padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 12 }} />

      <Text style={{ marginBottom: 6 }}>Transaction ID (optional)</Text>
      <TextInput value={transactionId} onChangeText={setTransactionId} placeholder="transaction id" style={{ padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 12 }} />

      <TouchableOpacity onPress={verify} disabled={loading} style={{ backgroundColor: '#10B981', padding: 14, borderRadius: 8, alignItems: 'center' }}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>VERIFY PAYMENT</Text>}
      </TouchableOpacity>
    </View>
  );
}
