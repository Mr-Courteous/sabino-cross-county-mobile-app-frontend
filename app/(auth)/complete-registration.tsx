import { View, ActivityIndicator, ScrollView, Platform, FlatList, ImageBackground, StyleSheet, Text, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '@/utils/api-service';
import { validatePassword } from '@/utils/password-validator';
import Purchases from 'react-native-purchases';
import { CustomButton } from '@/components/custom-button';
import { CustomInput } from '@/components/custom-input';
import { CustomAlert } from '@/components/custom-alert';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/design-system';

const REVENUECAT_GOOGLE_API_KEY = 'goog_DoercEbvtNXRhqfTjOYMkzCJKlX';

export default function CompleteRegistrationScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(width), [width]);
  const params = useLocalSearchParams();
  const email = params.email as string;
  const isMobilePlatform = Platform.OS === 'android' || Platform.OS === 'ios';

  const [countries, setCountries] = useState<Array<{ id: number, code: string, name: string }>>([]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState<'form' | 'payment'>('form');
  const [formData, setFormData] = useState({ password: '', confirmPassword: '', firstName: '', lastName: '', phone: '', schoolName: '', schoolType: 'private', country: '', countryId: null as number | null });

  const fetchCountries = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/countries`);
      const data = await response.json();
      if (data.success) setCountries(data.data);
    } catch (err) {}
  };

  useEffect(() => {
    fetchCountries();
    if (isMobilePlatform) {
      Purchases.configure({ apiKey: REVENUECAT_GOOGLE_API_KEY });
    }
  }, []);

  const handleCompleteRegistration = async () => {
    if (!formData.schoolName || !formData.password || !formData.firstName) { setError('Required fields missing'); return; }
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/schools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, email, paymentStatus: 'pending' }),
      });
      const res = await response.json();
      if (response.ok) setCurrentStep('payment');
      else throw new Error(res.error || 'Setup failed');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const isTiny = width < 300;

  return (
    <ThemedView style={{ flex: 1, backgroundColor: Colors.accent.navy }}>
      <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=2071' }} style={styles.hero}>
        <LinearGradient colors={['rgba(10, 15, 30, 0.8)', 'rgba(15, 23, 42, 0.98)']} style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.logoBadge}><Ionicons name="ribbon" size={20} color="#FACC15" /><Text style={styles.logoText}>SABINO EDU</Text></View>
              <Text style={styles.title}>{currentStep === 'form' ? 'Details' : 'Activation'}</Text>
              <View style={styles.goldBar} />
            </View>

            <View style={styles.card}>
              {error ? <CustomAlert type="error" title="Error" message={error} onClose={() => setError('')} style={{ marginBottom: 16 }} /> : null}
              {currentStep === 'form' ? (
                <>
                  <TouchableOpacity style={styles.dropdown} onPress={() => setShowCountryDropdown(!showCountryDropdown)}>
                    <Text style={[styles.dropdownText, !formData.country && { color: '#64748B' }]}>{formData.country || 'Select Country'}</Text>
                    <Ionicons name="chevron-down" size={18} color="#FACC15" />
                  </TouchableOpacity>
                  {showCountryDropdown && (
                    <View style={styles.dropdownList}>
                      {countries.map(c => (
                        <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => { setFormData({ ...formData, country: c.name, countryId: c.id }); setShowCountryDropdown(false); }}>
                          <Text style={styles.dropdownItemText}>{c.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <CustomInput label="School Name" placeholder="Legal Name" value={formData.schoolName} onChangeText={(t) => setFormData({ ...formData, schoolName: t })} />
                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 6 }}><CustomInput label="First Name" placeholder="Admin" value={formData.firstName} onChangeText={(t) => setFormData({ ...formData, firstName: t })} /></View>
                    <View style={{ flex: 1, marginLeft: 6 }}><CustomInput label="Last Name" placeholder="Name" value={formData.lastName} onChangeText={(t) => setFormData({ ...formData, lastName: t })} /></View>
                  </View>
                  <CustomInput label="Password" placeholder="••••••••" isPassword value={formData.password} onChangeText={(t) => setFormData({ ...formData, password: t })} />
                  <CustomButton title={loading ? "SAVING..." : "ACTIVATE"} onPress={handleCompleteRegistration} loading={loading} variant="premium" style={styles.ctaButton} />
                </>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Ionicons name="shield-checkmark" size={48} color="#FACC15" />
                  <Text style={styles.successTitle}>Verify Activation</Text>
                  <Text style={styles.subtitle}>Institutional record created. Use mobile store to activate billing.</Text>
                  <CustomButton title="OPEN DASHBOARD" onPress={() => router.replace('/dashboard')} variant="premium" style={styles.ctaButton} />
                </View>
              )}
            </View>
            <View style={styles.footer}><Text style={styles.footerText}>SECURE REGISTRATION</Text></View>
          </ScrollView>
        </LinearGradient>
      </ImageBackground>
    </ThemedView>
  );
}

function makeStyles(width: number) {
  const isTiny = width < 300;
  return StyleSheet.create({
    hero: { flex: 1, width: '100%' },
    overlay: { flex: 1, paddingHorizontal: isTiny ? 16 : 24 },
    scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingVertical: isTiny ? 30 : 50 },
    header: { alignItems: 'center', marginBottom: isTiny ? 20 : 30 },
    logoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    logoText: { color: '#FACC15', fontSize: 11, fontWeight: '900', marginLeft: 8, letterSpacing: 2 },
    title: { fontSize: isTiny ? 26 : 30, fontWeight: '900', color: '#fff', letterSpacing: -1 },
    goldBar: { width: 40, height: 3, backgroundColor: '#FACC15', borderRadius: 2, marginVertical: 12 },
    subtitle: { fontSize: 12, color: '#94A3B8', fontWeight: '500', textAlign: 'center', marginTop: 10 },
    card: { backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: 28, padding: isTiny ? 20 : 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    row: { flexDirection: 'row' },
    dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 10 },
    dropdownText: { color: '#F8FAFC', fontSize: 13, fontWeight: '500' },
    dropdownList: { backgroundColor: '#1E293B', borderRadius: 12, marginTop: -5, marginBottom: 12, maxHeight: 150 },
    dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    dropdownItemText: { color: '#F8FAFC', fontSize: 13 },
    ctaButton: { height: 52, borderRadius: 12, marginTop: 16, width: '100%' },
    successTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 16 },
    footer: { marginTop: 30, alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  });
}
