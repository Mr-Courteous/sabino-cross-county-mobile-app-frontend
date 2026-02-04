import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { API_BASE_URL } from '@/utils/api-service';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function VerifyOTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;

  const [otp, setOtp] = useState('');
  const [timeLeft, setTimeLeft] = useState(600);
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (timeLeft <= 0) {
      setError('OTP has expired. Please request a new one.');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      setError('Please enter the OTP');
      return;
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setError('OTP must be 6 digits');
      return;
    }

    if (timeLeft <= 0) {
      setError('OTP has expired. Please request a new one.');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/schools/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        router.push({
          pathname: '/(auth)/complete-registration',
          params: { email },
        });
      } else {
        setError(data.message || 'OTP verification failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify OTP';
      setError(errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  const handleRequestNewOTP = () => {
    router.back();
  };

  const isExpired = timeLeft <= 0;
  const isAlmostExpired = timeLeft <= 60;

  return (
    <ThemedView style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      <View style={{ marginBottom: 40 }}>
        <ThemedText type="title" style={{ marginBottom: 10 }}>
          Verify Email
        </ThemedText>
        <ThemedText type="subtitle" style={{ opacity: 0.7 }}>
          Step 2: Enter OTP
        </ThemedText>
      </View>

      <View style={{ marginBottom: 20, backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8 }}>
        <ThemedText style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
          Code sent to:
        </ThemedText>
        <ThemedText style={{ fontSize: 14, fontWeight: '600' }}>
          {email}
        </ThemedText>
      </View>

      <View style={{ marginBottom: 20 }}>
        <ThemedText style={{ marginBottom: 8, fontWeight: '600' }}>
          Enter 6-Digit Code
        </ThemedText>
        <TextInput
          style={{
            borderWidth: 2,
            borderColor: error ? '#f00' : '#ddd',
            borderRadius: 8,
            padding: 12,
            fontSize: 20,
            letterSpacing: 10,
            textAlign: 'center',
            backgroundColor: '#fff',
            fontWeight: 'bold',
          }}
          placeholder="000000"
          placeholderTextColor="#ccc"
          value={otp}
          onChangeText={(text) => {
            const digitsOnly = text.replace(/\D/g, '').slice(0, 6);
            setOtp(digitsOnly);
            setError('');
          }}
          editable={!isExpired && !verifying}
          keyboardType="numeric"
          maxLength={6}
        />
      </View>

      <View style={{ marginBottom: 20, alignItems: 'center' }}>
        <ThemedText
          style={{
            fontSize: 14,
            color: isAlmostExpired ? '#f00' : isExpired ? '#f00' : '#666',
            fontWeight: isAlmostExpired ? '600' : '400',
          }}
        >
          {isExpired ? '⏰ Code expired' : `⏱️ Code expires in ${formatTime(timeLeft)}`}
        </ThemedText>
      </View>

      {error ? (
        <View
          style={{
            backgroundColor: '#ffebee',
            borderLeftColor: '#d32f2f',
            borderLeftWidth: 5,
            padding: 14,
            borderRadius: 6,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#ffcdd2',
          }}
        >
          <ThemedText style={{ color: '#c62828', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
            ❌ Verification Error
          </ThemedText>
          <ThemedText style={{ color: '#b71c1c', fontSize: 14, lineHeight: 20 }}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      <TouchableOpacity
        style={{
          backgroundColor: isExpired || verifying ? '#ccc' : '#4CAF50',
          padding: 16,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 12,
          opacity: isExpired || verifying ? 0.6 : 1,
        }}
        onPress={handleVerifyOTP}
        disabled={isExpired || verifying}
      >
        {verifying ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
            <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Verifying...
            </ThemedText>
          </View>
        ) : (
          <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
            Verify & Continue
          </ThemedText>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          padding: 12,
          borderRadius: 8,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#4CAF50',
        }}
        onPress={handleRequestNewOTP}
        disabled={verifying}
      >
        <ThemedText style={{ color: '#4CAF50', fontSize: 14, fontWeight: '600' }}>
          Didn't receive a code? Request new OTP
        </ThemedText>
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
          ℹ️ Check your email (including spam folder) for the 6-digit verification code.
        </ThemedText>
      </View>
    </ThemedView>
  );
}
