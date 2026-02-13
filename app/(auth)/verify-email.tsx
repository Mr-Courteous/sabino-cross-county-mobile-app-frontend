import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { API_BASE_URL } from '@/utils/api-service';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';

export default function VerifyEmailScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(600);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpSent && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft <= 0) {
      setError('OTP has expired. Please request a new one.');
    }
    return () => clearInterval(timer);
  }, [otpSent, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendOTP = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid school email address');
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
        setOtpSent(true);
        setTimeLeft(600);
      } else {
        setError(result.message || result.error || 'Failed to send OTP');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code');
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
      setError(err instanceof Error ? err.message : 'Failed to verify OTP');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#0F172A' }}>
      <View style={{ marginBottom: 40, alignItems: 'center' }}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(250, 204, 21, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <Ionicons name="school" size={40} color="#FACC15" />
        </View>
        <Text style={{ fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 8 }}>
          School Registration
        </Text>
        <Text style={{ fontSize: 16, color: '#94A3B8', textAlign: 'center' }}>
          Step 1: Email Verification
        </Text>
      </View>

      <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }}>
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginBottom: 8 }}>
            School Email Address *
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', paddingHorizontal: 16 }}>
            <Ionicons name="mail-outline" size={20} color="#94A3B8" style={{ marginRight: 12 }} />
            <TextInput
              style={{ flex: 1, color: '#fff', fontSize: 16, paddingVertical: 16 }}
              placeholder="admin@school.com"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={(text) => { setEmail(text); setError(''); }}
              editable={!loading && !otpSent}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {otpSent && (
            <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(''); }} style={{ marginTop: 8 }}>
              <Text style={{ color: '#FACC15', fontSize: 12, fontWeight: '600' }}>Change Email</Text>
            </TouchableOpacity>
          )}
        </View>

        {otpSent && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#E2E8F0', marginBottom: 8 }}>
              Verification Code *
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', paddingHorizontal: 16 }}>
              <Ionicons name="key-outline" size={20} color="#94A3B8" style={{ marginRight: 12 }} />
              <TextInput
                style={{ flex: 1, color: '#fff', fontSize: 24, paddingVertical: 16, letterSpacing: 8, fontWeight: '900' }}
                placeholder="000000"
                placeholderTextColor="#64748B"
                value={otp}
                onChangeText={(text) => { setOtp(text.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                editable={!verifying}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>
            <View style={{ marginTop: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: timeLeft <= 60 ? '#EF4444' : '#94A3B8' }}>
                {timeLeft > 0 ? `⏱️ Code expires in ${formatTime(timeLeft)}` : '⏰ Code expired'}
              </Text>
            </View>
          </View>
        )}

        {error ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={{ color: '#EF4444', marginLeft: 8, flex: 1, fontSize: 14 }}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={{
            backgroundColor: '#FACC15',
            borderRadius: 12,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: (loading || verifying) ? 0.6 : 1,
          }}
          onPress={otpSent ? handleVerifyOTP : handleSendOTP}
          disabled={loading || verifying}
        >
          {loading || verifying ? (
            <ActivityIndicator color="#0F172A" />
          ) : (
            <>
              <Text style={{ color: '#0F172A', fontSize: 16, fontWeight: '900', letterSpacing: 1, marginRight: 8 }}>
                {otpSent ? 'VERIFY CODE' : 'GET OTP'}
              </Text>
              <Ionicons name={otpSent ? "checkmark-circle" : "mail"} size={20} color="#0F172A" />
            </>
          )}
        </TouchableOpacity>

        {otpSent && (
          <TouchableOpacity
            style={{ marginTop: 20, alignItems: 'center' }}
            onPress={handleSendOTP}
            disabled={loading || verifying}
          >
            <Text style={{ color: '#FACC15', fontSize: 14, fontWeight: '600' }}>
              {loading ? 'Resending...' : "Didn't receive code? Resend"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={{ marginTop: 32, alignItems: 'center' }}
        onPress={() => router.back()}
      >
        <Text style={{ color: '#94A3B8', fontSize: 14, fontWeight: '600' }}>← Back to Selection</Text>
      </TouchableOpacity>
    </ThemedView>
  );
}
