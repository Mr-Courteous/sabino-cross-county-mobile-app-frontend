import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';
import { Colors } from '@/constants/design-system';
import { CustomButton } from '@/components/custom-button';
import { CustomAlert } from '@/components/custom-alert';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppColors } from '@/hooks/use-app-colors';

export default function SchoolProfileEditPage() {
  const router = useRouter();
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C), [C.scheme]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ visible: boolean; type: 'success' | 'error'; message: string }>({
    visible: false,
    type: 'success',
    message: '',
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    registration_code: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = Platform.OS !== 'web' ? await SecureStore.getItemAsync('userToken') : localStorage.getItem('userToken');
      const res = await fetch(`${API_BASE_URL}/api/schools/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      if (result.success && result.data) {
        const d = result.data;
        setFormData({
          name: d.name || '',
          email: d.email || '',
          phone: d.phone || '',
          address: d.address || '',
          city: d.city || '',
          country: d.country || '',
          registration_code: d.registration_code || '',
        });
      }
    } catch (e) {
      setAlert({ visible: true, type: 'error', message: 'Failed to load profile data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!formData.name) {
      setAlert({ visible: true, type: 'error', message: 'Institution Name is required.' });
      return;
    }

    setSaving(true);
    setAlert({ ...alert, visible: false });

    try {
      const token = Platform.OS !== 'web' ? await SecureStore.getItemAsync('userToken') : localStorage.getItem('userToken');
      const res = await fetch(`${API_BASE_URL}/api/schools/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (result.success) {
        setAlert({ visible: true, type: 'success', message: 'Institution details updated successfully!' });
      } else {
        setAlert({ visible: true, type: 'error', message: result.error || result.message || 'Failed to update details.' });
      }
    } catch (e) {
      setAlert({ visible: true, type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.accent.gold} />
        <ThemedText style={styles.loadingText}>Loading Profile...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar style={C.isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Institution Profile</ThemedText>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {alert.visible && (
          <CustomAlert 
            type={alert.type} 
            message={alert.message} 
            onClose={() => setAlert({ ...alert, visible: false })} 
            style={{ marginBottom: 20 }}
          />
        )}

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Institution Name *</ThemedText>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholderTextColor={C.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Registration Number</ThemedText>
          <TextInput
            style={styles.input}
            value={formData.registration_code}
            onChangeText={(text) => setFormData({ ...formData, registration_code: text })}
            placeholder="Official School Reg. No"
            placeholderTextColor={C.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Official Email</ThemedText>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            placeholderTextColor={C.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Contact Phone</ThemedText>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => setFormData({ ...formData, phone: text })}
            keyboardType="phone-pad"
            placeholderTextColor={C.textMuted}
          />
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Address</ThemedText>
          <TextInput
            style={styles.input}
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            placeholderTextColor={C.textMuted}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
            <ThemedText style={styles.label}>City/State</ThemedText>
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
              placeholder="E.g. Lagos, LA"
              placeholderTextColor={C.textMuted}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <ThemedText style={styles.label}>Country</ThemedText>
            <TextInput
              style={[styles.input, { opacity: 0.6, backgroundColor: C.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }]}
              value={formData.country}
              editable={false}
              placeholder="Cannot be modified"
              placeholderTextColor={C.textMuted}
            />
          </View>
        </View>

        <CustomButton 
          title="Save Changes" 
          onPress={handleUpdate} 
          loading={saving} 
          variant="premium"
          style={styles.submitBtn} 
        />
      </ScrollView>
    </ThemedView>
  );
}

function makeStyles(C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
    loadingText: { color: Colors.accent.gold, marginTop: 15, fontWeight: '800', fontSize: 12, letterSpacing: 2 },
    
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: C.modalBg, borderBottomWidth: 1, borderColor: C.divider },
    backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.actionItemBg, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: C.text, fontSize: 18, fontWeight: '800' },

    scrollContent: { padding: 24, paddingBottom: 100 },
    
    formGroup: { marginBottom: 24 },
    row: { flexDirection: 'row' },
    label: { color: C.textLabel, fontSize: 11, fontWeight: '800', marginBottom: 10, letterSpacing: 1, marginLeft: 4 },
    input: { backgroundColor: C.inputBg, borderRadius: 16, padding: 16, color: C.inputText, fontSize: 15, fontWeight: '600', borderWidth: 1, borderColor: C.inputBorder },
    
    submitBtn: { marginTop: 10, borderRadius: 16, paddingVertical: 18 },
  });
}
