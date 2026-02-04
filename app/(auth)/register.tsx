import { useRouter } from 'expo-router';
import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function RegisterScreen() {
  const router = useRouter();

  return (
    <ThemedView style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
      {/* Header */}
      <View style={{ marginBottom: 40, alignItems: 'center' }}>
        <ThemedText type="title" style={{ marginBottom: 10 }}>
          School Registration
        </ThemedText>
        <ThemedText type="subtitle" style={{ opacity: 0.7, textAlign: 'center' }}>
          Join our School Portal and manage students & scores
        </ThemedText>
      </View>

      {/* Start Button */}
      <TouchableOpacity
        style={{
          backgroundColor: '#4CAF50',
          padding: 18,
          borderRadius: 8,
          alignItems: 'center',
          marginBottom: 16,
        }}
        onPress={() => {
          console.log('[REGISTER] Starting registration flow');
          router.push('/(auth)/verify-email');
        }}
      >
        <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
          Start Registration
        </ThemedText>
      </TouchableOpacity>

      {/* Back Button */}
      <TouchableOpacity
        style={{
          padding: 14,
          borderRadius: 8,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#4CAF50',
        }}
        onPress={() => router.push('/(auth)')}
      >
        <ThemedText style={{ color: '#4CAF50', fontSize: 14, fontWeight: '600' }}>
          Already Registered? Login
        </ThemedText>
      </TouchableOpacity>

      {/* Info Box */}
      <View
        style={{
          backgroundColor: '#e3f2fd',
          padding: 12,
          borderRadius: 8,
          marginTop: 30,
        }}
      >
        <ThemedText style={{ fontSize: 13, color: '#1976d2', lineHeight: 20 }}>
          ℹ️ Registration is a 3-step process:{'\n'}
          1️⃣ Verify your email with a code{'\n'}
          2️⃣ Enter the 6-digit OTP{'\n'}
          3️⃣ Complete your school details
        </ThemedText>
      </View>
    </ThemedView>
  );
}