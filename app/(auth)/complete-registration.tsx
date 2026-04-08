import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, ScrollView, Alert, Platform, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { API_BASE_URL } from '@/utils/api-service';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { validatePassword } from '@/utils/password-validator';
import Purchases from 'react-native-purchases';

const REVENUECAT_GOOGLE_API_KEY = 'goog_DoercEbvtNXRhqfTjOYMkzCJKlX';
const REVENUECAT_APPLE_API_KEY = 'YOUR_REVENUECAT_APPLE_API_KEY';

export default function CompleteRegistrationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const email = params.email as string;
  const isMobilePlatform = Platform.OS === 'android' || Platform.OS === 'ios';

  const [countries, setCountries] = useState<Array<{ id: number, code: string, name: string, description: string }>>([]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [countriesError, setCountriesError] = useState('');

  // REGISTRATION & FLOW MGMT
  const [currentStep, setCurrentStep] = useState<'form' | 'payment'>('form');
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    schoolName: '',
    schoolType: 'private',
    country: '',
    countryId: null as number | null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // BILLING STATE
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [isResumingPayment, setIsResumingPayment] = useState(false);

  const showError = (title: string, message: any) => {
    console.log(`[BIILING ERROR] ${title}:`, message);
    Alert.alert(
      title,
      typeof message === 'string' ? message : (message?.message || JSON.stringify(message))
    );
  };

  const fetchCountries = async () => {
    try {
      setLoadingCountries(true);
      const response = await fetch(`${API_BASE_URL}/api/auth/countries`);
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setCountries(data.data);
      } else {
        setCountriesError('Failed to load countries');
      }
    } catch (err) {
      console.error('[FETCH] Countries error:', err);
      setCountriesError('Error fetching countries list');
    } finally {
      setLoadingCountries(false);
    }
  };

  const checkAccountStatus = async () => {
    if (!email) return;
    try {
      setCheckingAccount(true);
      const response = await fetch(`${API_BASE_URL}/api/schools/check-status/${encodeURIComponent(email)}`, {
        method: 'GET'
      });
      const result = await response.json();
      if (result.alreadyRegistered) {
        if (result.resumePayment) {
          setIsResumingPayment(true);
          if (result.data) {
            setFormData(prev => ({ ...prev, schoolName: result.data.name || prev.schoolName }));
            setSchoolId(result.data.schoolId);
          }
          setCurrentStep('payment');
        } else if (result.data?.paymentStatus === 'completed') {
          Alert.alert("Already Active", "This school is already active. Please login.", [
            { text: "Go to Login", onPress: () => router.replace('/(auth)') }
          ]);
        }
      }
    } catch (err) {
      console.log("[CHECK] Network error on mount:", err);
    } finally {
      setTimeout(() => setCheckingAccount(false), 800);
    }
  };

  const setupRevenueCat = async () => {
    try {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      if (Platform.OS === 'ios') {
        // No usesStoreKit2IfAvailable flag set — RevenueCat uses its default SK1 path
        // which ensures transactions are finished/acknowledged reliably.
        await Purchases.configure({ apiKey: REVENUECAT_APPLE_API_KEY });
      } else {
        await Purchases.configure({ apiKey: REVENUECAT_GOOGLE_API_KEY });
      }
      console.log('[RevenueCat] SDK configured successfully.');
    } catch (e: any) {
      console.error('[RevenueCat] Configuration error:', e);
      setBillingError('Failed to connect to billing service.');
    }
  };


  useEffect(() => {
    fetchCountries();
    checkAccountStatus();
    if (isMobilePlatform) {
      setupRevenueCat();
    }
  }, []);

  const validateForm = () => {
    if (!formData.country.trim()) { setError('Please select a country'); return false; }
    if (!formData.schoolName.trim()) { setError('School name is required'); return false; }
    if (!formData.password.trim()) { setError('Password is required'); return false; }
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) { setError(passwordValidation.errorMessage); return false; }
    if (formData.password !== formData.confirmPassword) { setError('Passwords do not match'); return false; }
    if (!formData.firstName.trim()) { setError('First name is required'); return false; }
    if (!formData.lastName.trim()) { setError('Last name is required'); return false; }
    return true;
  };

  const handleCompleteRegistration = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError('');

    try {
      const regData = {
        email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
        name: formData.schoolName,
        school_type: formData.schoolType,
        country: formData.country,
        countryId: formData.countryId,
      };

      const response = await fetch(`${API_BASE_URL}/api/schools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...regData, paymentStatus: 'pending' }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || responseData.message || 'Account creation failed');
      }

      console.log(`[POST] Registered/Updated:`, responseData.data);
      const accountData = responseData.data;
      const sId = accountData.user?.schoolId;

      // Tell RevenueCat who this user is so the webhook knows which DB row to update
      if (isMobilePlatform && sId) {
        await Purchases.logIn(sId.toString());
        console.log(`[RevenueCat] Logged in with school ID: ${sId}`);
      }

      setSchoolId(sId);
      setAuthToken(responseData.token);
      setIsResumingPayment(!!responseData.resumePayment);
      setCurrentStep('payment');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!isMobilePlatform) {
      Alert.alert("Platform Not Supported", "Billing is only supported on Android or iOS devices.");
      return;
    }

    setIsProcessingPayment(true);
    try {
      console.log('[RevenueCat] Fetching available offerings...');
      const offerings = await Purchases.getOfferings();

      console.log('[RevenueCat] All offerings:', JSON.stringify(offerings, null, 2));

      const currentOffering = offerings.current;
      if (!currentOffering) {
        throw new Error('No offerings available. Ensure a Current Offering is configured in the RevenueCat dashboard.');
      }

      const packageToPurchase = currentOffering.monthly ?? currentOffering.availablePackages[0];
      if (!packageToPurchase) {
        throw new Error('No purchasable package found in the current offering.');
      }

      console.log('[RevenueCat] Purchasing package:', packageToPurchase.identifier);
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

      // ⚡ Check entitlement immediately — avoid any heavy/blocking work here so the
      // SDK can finalize the transaction acknowledgement back to Google/Apple.
      // The entitlement name is case-sensitive — must match your RevenueCat dashboard exactly.
      if (customerInfo.entitlements.active['Sabinoschool'] !== undefined) {
        // Access granted — log details after the check, not before
        console.log('[RevenueCat] Purchase successful. Active entitlements:', Object.keys(customerInfo.entitlements.active));
        console.log('[RevenueCat] Full customerInfo:', JSON.stringify(customerInfo, null, 2));
        Alert.alert('Success', 'Account Activated! Welcome aboard.', [
          { text: 'Continue', onPress: () => router.replace('/dashboard') }
        ]);
      } else {
        // Log what was actually returned to help diagnose entitlement name mismatches
        console.warn('[RevenueCat] No matching entitlement. Active keys:', Object.keys(customerInfo.entitlements.active));
        console.warn('[RevenueCat] Full customerInfo:', JSON.stringify(customerInfo, null, 2));
        throw new Error('Purchase completed but no entitlement was granted. Please contact support.');
      }
    } catch (err: any) {
      // RevenueCat throws a specific error code for user cancellations
      if (!err.userCancelled) {
        console.error('[RevenueCat] Purchase error:', err);
        showError('Subscription Error', err.message || err);
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsProcessingPayment(true);
      console.log('[RevenueCat] Restoring purchases...');
      const customerInfo = await Purchases.restorePurchases();

      // Log all active entitlements so we can verify the exact name if needed
      console.log('[RevenueCat] Restored entitlements:', Object.keys(customerInfo.entitlements.active));

      // Check for the specific entitlement — name is case-sensitive, must match RevenueCat dashboard exactly
      const hasActiveEntitlement = customerInfo.entitlements.active['Sabinoschool'] !== undefined;

      if (hasActiveEntitlement) {
        Alert.alert('Restored!', 'Your subscription has been restored.', [
          { text: 'Continue', onPress: () => router.replace('/dashboard') }
        ]);
      } else {
        Alert.alert('Notice', 'No active subscriptions found to restore.');
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        showError('Restore Failed', e.message || e);
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleBackToForm = () => {
    setCurrentStep('form');
    setBillingError('');
    setIsResumingPayment(false);
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      {checkingAccount && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <ThemedText style={{ marginTop: 12, fontWeight: '600', color: '#4CAF50' }}>Preparing registration...</ThemedText>
        </View>
      )}

      <ScrollView style={{ flex: 1, padding: 20 }} contentContainerStyle={{ paddingBottom: 60 }}>
        {currentStep === 'form' && (
          <>
            <View style={{ marginBottom: 30 }}>
              <ThemedText type="title">Complete Registration</ThemedText>
              <ThemedText type="subtitle" style={{ opacity: 0.7 }}>Step 3: Account Details</ThemedText>
            </View>

            {countriesError && (
              <View style={{ backgroundColor: '#fff3cd', padding: 12, borderRadius: 6, marginBottom: 16 }}>
                <ThemedText style={{ color: '#856404' }}>⚠️ {countriesError}</ThemedText>
                <TouchableOpacity onPress={fetchCountries}><ThemedText style={{ color: '#007AFF', marginTop: 5 }}>Retry loading countries</ThemedText></TouchableOpacity>
              </View>
            )}

            {!loadingCountries && countries.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <ThemedText style={{ marginBottom: 6, fontWeight: '600' }}>Country *</ThemedText>
                <TouchableOpacity
                  style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 12, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between' }}
                  onPress={() => setShowCountryDropdown(!showCountryDropdown)}
                >
                  <ThemedText style={{ color: formData.country ? '#000' : '#999' }}>{formData.country || 'Select your country'}</ThemedText>
                  <ThemedText>{showCountryDropdown ? '▲' : '▼'}</ThemedText>
                </TouchableOpacity>

                {showCountryDropdown && (
                  <View style={{ borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff', maxHeight: 200, marginTop: -1, zIndex: 1000 }}>
                    <FlatList
                      data={countries}
                      keyExtractor={(item) => String(item.id)}
                      renderItem={({ item }) => (
                        <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }} onPress={() => { setFormData({ ...formData, country: item.name, countryId: item.id }); setShowCountryDropdown(false); }}>
                          <ThemedText>{item.name}</ThemedText>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}
              </View>
            )}

            <View style={{ marginBottom: 16 }}>
              <ThemedText style={{ marginBottom: 6, fontWeight: '600' }}>School Name *</ThemedText>
              <TextInput style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, backgroundColor: '#fff' }} placeholder="My Awesome School" value={formData.schoolName} onChangeText={(text) => setFormData({ ...formData, schoolName: text })} />
            </View>

            <View style={{ marginBottom: 16, flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ marginBottom: 6, fontWeight: '600' }}>First Name *</ThemedText>
                <TextInput style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, backgroundColor: '#fff' }} placeholder="Jane" value={formData.firstName} onChangeText={(text) => setFormData({ ...formData, firstName: text })} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={{ marginBottom: 6, fontWeight: '600' }}>Last Name *</ThemedText>
                <TextInput style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, backgroundColor: '#fff' }} placeholder="Doe" value={formData.lastName} onChangeText={(text) => setFormData({ ...formData, lastName: text })} />
              </View>
            </View>

            <View style={{ marginBottom: 24 }}>
              <ThemedText style={{ marginBottom: 6, fontWeight: '600' }}>Password *</ThemedText>
              <View style={{ position: 'relative' }}>
                <TextInput secureTextEntry={!showPassword} style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, paddingRight: 45, backgroundColor: '#fff' }} placeholder="Secure Password" value={formData.password} onChangeText={(text) => setFormData({ ...formData, password: text })} />
                <TouchableOpacity style={{ position: 'absolute', right: 10, top: 10, padding: 5 }} onPress={() => setShowPassword(!showPassword)}>
                  <Text style={{ fontSize: 18 }}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginBottom: 24 }}>
              <ThemedText style={{ marginBottom: 6, fontWeight: '600' }}>Confirm Password *</ThemedText>
              <View style={{ position: 'relative' }}>
                <TextInput secureTextEntry={!showConfirmPassword} style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, paddingRight: 45, backgroundColor: '#fff' }} placeholder="Repeat Password" value={formData.confirmPassword} onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })} />
                <TouchableOpacity style={{ position: 'absolute', right: 10, top: 10, padding: 5 }} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Text style={{ fontSize: 18 }}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {error ? <ThemedText style={{ color: '#d32f2f', marginBottom: 16, fontWeight: '600' }}>❌ {error}</ThemedText> : null}

            <TouchableOpacity
              style={{ backgroundColor: loading ? '#ccc' : '#4CAF50', padding: 16, borderRadius: 8, alignItems: 'center' }}
              onPress={handleCompleteRegistration}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Continue to Payment</ThemedText>
              )}
            </TouchableOpacity>
          </>
        )}

        {currentStep === 'payment' && (
          <>
            <View style={{ marginBottom: 30 }}>
              <ThemedText type="title">Activate Subscription</ThemedText>
              <ThemedText type="subtitle" style={{ opacity: 0.7 }}>Secure access via Google Play</ThemedText>
            </View>

            {billingError ? (
              <View style={{ backgroundColor: '#ffebee', padding: 20, borderRadius: 8, borderLeftWidth: 5, borderLeftColor: '#d32f2f', marginBottom: 25 }}>
                <ThemedText style={{ color: '#c62828', fontWeight: 'bold', marginBottom: 5 }}>Store Error</ThemedText>
                <ThemedText style={{ color: '#b71c1c' }}>{billingError}</ThemedText>
                <TouchableOpacity onPress={setupRevenueCat} style={{ marginTop: 10 }}><ThemedText style={{ color: '#007AFF' }}>Retry connecting to store</ThemedText></TouchableOpacity>
              </View>
            ) : null}

            <View style={{ backgroundColor: '#f9f9f9', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', marginBottom: 30 }}>
              <ThemedText style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>📱 Sabino School Portal</ThemedText>
              <ThemedText style={{ fontSize: 24, fontWeight: 'bold', color: '#4CAF50', marginBottom: 10 }}>
                ₦5,000 / month
              </ThemedText>
              <ThemedText style={{ fontSize: 14, color: '#666', lineHeight: 20 }}>
                Get full access to school management features, student registries, and report generation.
              </ThemedText>
            </View>

            <TouchableOpacity
              style={{ padding: 18, borderRadius: 8, alignItems: 'center', backgroundColor: isProcessingPayment || !isMobilePlatform ? '#ccc' : '#4CAF50' }}
              onPress={handlePurchase}
              disabled={isProcessingPayment || !isMobilePlatform}
            >
              {isProcessingPayment ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
                  Subscribe via Google Play
                </ThemedText>
              )}
            </TouchableOpacity>

            {!isMobilePlatform && (
              <ThemedText style={{ color: '#D32F2F', textAlign: 'center', marginTop: 12, fontSize: 13 }}>
                💳 Billing is only available on physical mobile devices.
              </ThemedText>
            )}

            {isMobilePlatform && (
              <TouchableOpacity
                onPress={handleRestore}
                disabled={isProcessingPayment}
                style={{ marginTop: 15, alignItems: 'center' }}
              >
                <ThemedText style={{ color: '#007AFF', textAlign: 'center', fontSize: 14 }}>
                  🔄 Restore Previous Purchase
                </ThemedText>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={{ marginTop: 20, alignItems: 'center' }} onPress={handleBackToForm}>
              <ThemedText style={{ color: '#666' }}>← Edit school details</ThemedText>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}
