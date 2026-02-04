import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '@/utils/api-service';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function VerifyEmailScreen() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/schools/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        router.push({
          pathname: '/(auth)/verify-otp',
          params: { email },
        });
      } else {
        setError(result.message || 'Failed to send OTP');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <View style={{ marginBottom: 40 }}>
        <ThemedText type="title" style={{ marginBottom: 10 }}>
          School Registration
        </ThemedText>
        <ThemedText type="subtitle" style={{ opacity: 0.7 }}>
          Step 1: Verify Email
        </ThemedText>
      </View>

      <View style={{ marginBottom: 20 }}>
        <ThemedText style={{ marginBottom: 8, fontWeight: '600' }}>
          School Email Address
        </ThemedText>
        <TextInput
          style={{
            borderWidth: 1,
            borderColor: '#ddd',
            borderRadius: 8,
            padding: 12,
            fontSize: 16,
            backgroundColor: '#fff',
          }}
          placeholder="admin@school.com"
          placeholderTextColor="#999"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setError('');
          }}
          editable={!loading}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      {error ? (
        <View
          style={{
            backgroundColor: '#fee',
            borderLeftColor: '#f00',
            borderLeftWidth: 4,
            padding: 12,
            borderRadius: 4,
            marginBottom: 20,
          }}
        >
          <ThemedText style={{ color: '#c33', fontSize: 14 }}>
            ⚠️ {error}
          </ThemedText>
        </View>
      ) : null}

      <TouchableOpacity
        style={{
          backgroundColor: loading ? '#ccc' : '#4CAF50',
          padding: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 16,
          opacity: loading ? 0.6 : 1,
        }}
        onPress={handleSendOTP}
        disabled={loading}
      >
        {loading ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
            <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Sending OTP...
            </ThemedText>
          </View>
        ) : (
          <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
            Send OTP to Email
          </ThemedText>
        )}
      </TouchableOpacity>

      <View
        style={{
          backgroundColor: '#e3f2fd',
          padding: 12,
          borderRadius: 8,
          marginTop: 20,
        }}
      >
        <ThemedText style={{ fontSize: 12, color: '#1976d2', lineHeight: 18 }}>
          ℹ️ A 6-digit code will be sent to your email address. You'll have 10 minutes to verify it.
        </ThemedText>
      </View>
    </ThemedView>
  );
}
