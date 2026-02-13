import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Linking, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';

export default function InitiatePayment() {
  const routePlanId = undefined; // fallback; we'll parse web query params below
  const router = useRouter();
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
    <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 12 }}>Initiate Payment</Text>

      <Text style={{ marginBottom: 6 }}>Plan ID</Text>
      <TextInput
        value={String(planId)}
        onChangeText={setPlanId}
        placeholder="Plan ID"
        keyboardType="numeric"
        style={{ padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 12 }}
      />

      <TouchableOpacity onPress={initiate} disabled={loading} style={{ backgroundColor: '#1a73e8', padding: 14, borderRadius: 8, alignItems: 'center' }}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>GET PAYMENT LINK</Text>}
      </TouchableOpacity>

      {txRef ? (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 12, color: '#666' }}>Tx Ref: {txRef}</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/(payments)/verify', params: { tx_ref: txRef, plan_id: planId } } as any)} style={{ marginTop: 8 }}>
            <Text style={{ color: '#1a73e8' }}>Verify Payment</Text>
          </TouchableOpacity>
        </View>
      ) : null}

    </View>
  );
}
