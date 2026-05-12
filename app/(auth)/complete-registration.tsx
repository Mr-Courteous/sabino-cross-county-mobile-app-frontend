import { View, ActivityIndicator, ScrollView, Platform, FlatList, ImageBackground, StyleSheet, Text, TouchableOpacity, useWindowDimensions, Image } from 'react-native';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '@/utils/api-service';
import { validatePassword } from '@/utils/password-validator';
import Purchases from 'react-native-purchases';
import * as SecureStore from 'expo-secure-store';
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
  const [rcPackage, setRcPackage] = useState<any>(null);
  const [loadingPackage, setLoadingPackage] = useState(isMobilePlatform);
  const [purchasing, setPurchasing] = useState(false);
  const [billingMessage, setBillingMessage] = useState('');
  const [paymentStep, setPaymentStep] = useState<'info' | 'purchasing' | 'success'>('info');
  const [schoolId, setSchoolId] = useState<number | null>(null);

  const fetchCountries = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/countries`);
      const data = await response.json();
      if (data.success) setCountries(data.data);
    } catch (err) { }
  };

  const getAuthToken = async () => {
    try {
      return Platform.OS === 'web'
        ? localStorage.getItem('userToken')
        : await SecureStore.getItemAsync('userToken');
    } catch (err) {
      return null;
    }
  };

  const getStoredUserId = async () => {
    try {
      const storedUser = Platform.OS === 'web'
        ? localStorage.getItem('userData')
        : await SecureStore.getItemAsync('userData');

      if (!storedUser) return undefined;
      const parsed = JSON.parse(storedUser);
      return parsed?.schoolId?.toString() || parsed?.id?.toString();
    } catch (err) {
      return undefined;
    }
  };

  const setAuthToken = async (token: string) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('userToken', token);
      } else {
        await SecureStore.setItemAsync('userToken', token);
      }
    } catch (err) {
      console.error('Failed to store auth token:', err);
    }
  };

  const setUserData = async (data: any) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('userData', JSON.stringify(data));
      } else {
        await SecureStore.setItemAsync('userData', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Failed to store user data:', err);
    }
  };

  useEffect(() => {
    fetchCountries();
    if (isMobilePlatform) {
      Purchases.configure({ apiKey: REVENUECAT_GOOGLE_API_KEY });

      const loadOfferings = async () => {
        setLoadingPackage(true);
        try {
          const offerings = await Purchases.getOfferings();
          const current = offerings.current;
          const availablePackages = current?.availablePackages;
          if (availablePackages && availablePackages.length > 0) {
            setRcPackage(availablePackages[0]);
          } else {
            setBillingMessage('No active subscription plans are available in Google Play / App Store.');
          }
        } catch (err: any) {
          setBillingMessage(`Could not connect to store: ${err.message || err}`);
        } finally {
          setLoadingPackage(false);
        }
      };

      loadOfferings();
    } else {
      setLoadingPackage(false);
    }
  }, []);



  const handleCompleteRegistration = async () => {
    if (!formData.schoolName || !formData.password || !formData.firstName || !formData.countryId) {
      setError('Please fill all required fields, including selecting your country');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const passValidation = validatePassword(formData.password);
    if (!passValidation.isValid) {
      setError(passValidation.errorMessage);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.schoolName,
        email: email.toLowerCase(),
        password: formData.password,
        school_type: formData.schoolType,
        country_id: formData.countryId,
        country: formData.country,
        phone: formData.phone,
        payment_status: 'pending'
      };

      const response = await fetch(`${API_BASE_URL}/api/schools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = await response.json();
      if (response.ok && res.data) {
        // Store token and user data for subsequent API calls
        if (res.data.token) {
          await setAuthToken(res.data.token);
        }
        if (res.data.id || res.data.user?.schoolId) {
          const sid = res.data.id || res.data.user?.schoolId;
          setSchoolId(sid);
          await setUserData({ id: sid, schoolId: sid, ...res.data.user, ...res.data });

          // Identity sync with RevenueCat for mobile
          if (isMobilePlatform) {
            try {
              await Purchases.logIn(sid.toString());
              console.log(`👤 [Registration] Identified RevenueCat user as: ${sid}`);

              // Re-fetch offerings under the correct identity
              const offerings = await Purchases.getOfferings();
              const pkg = offerings.current?.availablePackages?.[0];
              if (pkg) setRcPackage(pkg);
            } catch (rcErr) {
              console.warn('[Registration] RevenueCat logIn/offerings failed:', rcErr);
            }
          }
        }
        setPaymentStep('info');
        setCurrentStep('payment');
      } else throw new Error(res.error || 'Setup failed');
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const syncSubscriptionWithBackend = async () => {
    try {
      const token = await getAuthToken(); // already stored from registration
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/schools/sync-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      console.log('[Registration] Sync result:', data);
    } catch (err) {
      // Non-fatal — webhook will catch it if sync fails
      console.warn('[Registration] Sync failed, webhook will handle it:', err);
    }
  };

  const handleSubscriptionPurchase = async () => {
    if (!rcPackage) return;
    setBillingMessage('');
    setPurchasing(true);
    setPaymentStep('purchasing');

    try {
      const { customerInfo } = await Purchases.purchasePackage(rcPackage);
      const isActive = Object.keys(customerInfo.entitlements.active).length > 0;

      if (isActive) {
        // ← Sync backend DB now, don't wait for webhook
        await syncSubscriptionWithBackend();
        setPaymentStep('success');
        // Auto-redirect to dashboard after a short delay
        setTimeout(() => {
          router.replace('/dashboard' as any);
        }, 1500);
      } else {
        throw new Error('Payment completed but access not yet activated. Try restoring.');
      }
    } catch (err: any) {
      if (err?.userCancelled) {
        setPaymentStep('info');
        setPurchasing(false);
        return;
      }
      setBillingMessage(err.message || 'Payment failed.');
      setPaymentStep('info');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestorePurchase = async () => {
    if (!isMobilePlatform) return; // just do nothing on web, no bypass

    setBillingMessage('');
    setPurchasing(true);

    try {
      const customerInfo = await Purchases.restorePurchases();
      const isActive = Object.keys(customerInfo.entitlements.active).length > 0;

      if (isActive) {
        await syncSubscriptionWithBackend(); // ← same sync
        setPaymentStep('success');
        setTimeout(() => {
          router.replace('/dashboard' as any);
        }, 1500);
      } else {
        setBillingMessage('No active subscriptions found.');
      }
    } catch (err: any) {
      setBillingMessage(err.message || 'Restore failed.');
    } finally {
      setPurchasing(false);
    }
  };

  const isTiny = width < 300;

  return (
    <ThemedView style={{ flex: 1, backgroundColor: Colors.accent.navy }}>
      <ImageBackground source={{ uri: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=2071' }} style={styles.hero}>
        <LinearGradient colors={['rgba(10, 15, 30, 0.8)', 'rgba(15, 23, 42, 0.98)']} style={styles.overlay}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.homeBtn}
                onPress={() => {
                  router.replace('/home');
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="home-outline" size={18} color="#fff" />
              </TouchableOpacity>
              <View style={styles.logoBadge}>
                <Image source={require('../../assets/images/sabino.jpeg')} style={{ width: 40, height: 40, borderRadius: 20 }} />
                <Text style={styles.logoText}>SABINO EDU</Text>
              </View>
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
                    <ScrollView style={styles.dropdownList} contentContainerStyle={styles.dropdownListContent} nestedScrollEnabled>
                      {countries.map(c => (
                        <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => { setFormData({ ...formData, country: c.name, countryId: c.id }); setShowCountryDropdown(false); }}>
                          <Text style={styles.dropdownItemText}>{c.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                  <CustomInput label="School Name" placeholder="School Name" value={formData.schoolName} onChangeText={(t) => setFormData({ ...formData, schoolName: t })} />
                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 6 }}><CustomInput label="First Name" placeholder="First Name" value={formData.firstName} onChangeText={(t) => setFormData({ ...formData, firstName: t })} /></View>
                    <View style={{ flex: 1, marginLeft: 6 }}><CustomInput label="Last Name" placeholder="Last Name" value={formData.lastName} onChangeText={(t) => setFormData({ ...formData, lastName: t })} /></View>
                  </View>
                  <CustomInput label="Password" placeholder="••••••••" isPassword value={formData.password} onChangeText={(t) => setFormData({ ...formData, password: t })} />
                  <CustomInput label="Confirm Password" placeholder="••••••••" isPassword value={formData.confirmPassword} onChangeText={(t) => setFormData({ ...formData, confirmPassword: t })} />

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -4, marginBottom: 12 }}>
                    <Ionicons name="information-circle-outline" size={12} color="#94A3B8" />
                    <Text style={{ color: '#94A3B8', fontSize: 9, marginLeft: 6, fontWeight: '700' }}>
                      USE STRONG PASSWORD: 8+ CHARS (A-Z, a-z, 0-9, !@#$)
                    </Text>
                  </View>
                  <CustomButton title={loading ? "SAVING..." : "ACTIVATE"} onPress={handleCompleteRegistration} loading={loading} variant="premium" style={styles.ctaButton} />
                </>
              ) : (
                <>
                  {paymentStep === 'info' && (
                    <View style={{ alignItems: 'center' }}>
                      <Ionicons name="shield-checkmark" size={48} color="#FACC15" />
                      <Text style={styles.successTitle}>Complete Your Subscription</Text>
                      <Text style={styles.subtitle}>
                        Your school account is created. Complete your subscription to start using Sabino Edu.
                      </Text>

                      {isMobilePlatform ? (
                        <>
                          {loadingPackage ? (
                            <ActivityIndicator color="#FACC15" style={{ marginVertical: 16 }} />
                          ) : rcPackage ? (
                            <>
                              <View style={styles.priceTag}>
                                <Text style={styles.priceLabel}>Premium School Plan</Text>
                                <Text style={styles.priceValue}>{rcPackage.product.priceString}</Text>
                                <Text style={styles.pricePeriod}>Billed Every Four Months</Text>
                              </View>

                              <CustomButton
                                title={purchasing ? 'PROCESSING...' : 'COMPLETE SUBSCRIPTION'}
                                onPress={handleSubscriptionPurchase}
                                loading={purchasing}
                                variant="premium"
                                style={styles.ctaButton}
                              />
                            </>
                          ) : (
                            <Text style={[styles.subtitle, { marginTop: 16, color: '#FACC15' }]}>{billingMessage || 'Unable to load subscription details right now.'}</Text>
                          )}
                        </>
                      ) : (
                        <Text style={[styles.subtitle, { marginTop: 16 }]}>Billing is only available on Android/iOS devices. Please open the app on a mobile device to complete your subscription.</Text>
                      )}

                      {billingMessage ? <Text style={{ color: '#F87171', marginTop: 12, textAlign: 'center' }}>{billingMessage}</Text> : null}

                      <TouchableOpacity
                        style={{ marginTop: 20 }}
                        onPress={handleRestorePurchase}
                        disabled={purchasing}
                      >
                        <Text style={{ color: '#64748B', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' }}>Restore Purchases</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {paymentStep === 'purchasing' && (
                    <View style={styles.centered}>
                      <ActivityIndicator size="large" color="#FACC15" />
                      <Text style={styles.loadingTitle}>Connecting to Store...</Text>
                      <Text style={styles.loadingSubtitle}>Please complete the payment in the system dialog.</Text>
                    </View>
                  )}

                  {paymentStep === 'success' && (
                    <View style={styles.centered}>
                      <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                      <Text style={[styles.successTitle, { color: '#10B981', marginTop: 20 }]}>Payment Successful!</Text>
                      <Text style={styles.successSubtitle}>Your school account is now fully active.</Text>
                      <CustomButton
                        title="OPEN DASHBOARD"
                        onPress={() => router.replace('/dashboard' as any)}
                        variant="premium"
                        style={styles.ctaButton}
                      />
                    </View>
                  )}
                </>
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
    backBtn: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 18,
      zIndex: 10
    },
    homeBtn: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderRadius: 18,
      zIndex: 10
    },
    logoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    logoText: { color: '#FACC15', fontSize: 11, fontWeight: '900', marginLeft: 8, letterSpacing: 2 },
    title: { fontSize: isTiny ? 26 : 30, fontWeight: '900', color: '#fff', letterSpacing: -1 },
    goldBar: { width: 40, height: 3, backgroundColor: '#FACC15', borderRadius: 2, marginVertical: 12 },
    subtitle: { fontSize: 12, color: '#94A3B8', fontWeight: '500', textAlign: 'center', marginTop: 10 },
    card: { backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: 28, padding: isTiny ? 20 : 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    row: { flexDirection: 'row' },
    dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.5)', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 10 },
    dropdownText: { color: '#F8FAFC', fontSize: 13, fontWeight: '500' },
    dropdownList: { backgroundColor: '#1E293B', borderRadius: 12, marginTop: -5, marginBottom: 12, maxHeight: 220 },
    dropdownListContent: { paddingVertical: 4 },
    dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    dropdownItemText: { color: '#F8FAFC', fontSize: 13 },
    ctaButton: { height: 52, borderRadius: 12, marginTop: 16, width: '100%' },
    successTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 16 },
    priceTag: {
      backgroundColor: 'rgba(250,204,21,0.08)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(250,204,21,0.2)',
      padding: 20,
      alignItems: 'center',
      marginTop: 18,
      marginBottom: 10,
      width: '100%'
    },
    priceLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 4 },
    priceValue: { color: '#fff', fontSize: 32, fontWeight: '900' },
    pricePeriod: { color: '#64748B', fontSize: 12, marginTop: 4 },
    centered: { alignItems: 'center', paddingVertical: 30 },
    loadingTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 20 },
    loadingSubtitle: { color: '#94A3B8', fontSize: 14, marginTop: 8, textAlign: 'center' },
    successSubtitle: { color: '#94A3B8', fontSize: 14, marginTop: 8, marginBottom: 20, textAlign: 'center' },
    footer: { marginTop: 30, alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  });
}
