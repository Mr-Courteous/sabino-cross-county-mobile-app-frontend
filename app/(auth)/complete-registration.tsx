import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, ScrollView, Alert, Platform, FlatList } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { validatePassword } from '@/utils/password-validator';

export default function CompleteRegistrationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const email = params.email as string;
  const isMobilePlatform = Platform.OS === 'android' || Platform.OS === 'ios';

  const [countries, setCountries] = useState<Array<{ id: number, code: string, name: string, description: string }>>([]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [countriesError, setCountriesError] = useState('');

  // REGISTRATION STEP MANAGEMENT
  const [currentStep, setCurrentStep] = useState<'form' | 'payment'>('form');
  const [registrationData, setRegistrationData] = useState<any>(null);

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
  const [billingPlan, setBillingPlan] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [isResumingPayment, setIsResumingPayment] = useState(false);
  const [loadingBilling, setLoadingBilling] = useState(true);

  // Use refs to handle the async nature of InAppPurchases listener
  const purchaseResolverRef = useRef<any>(null);

  // Your subscription ID from Google Play
  const SUBSCRIPTION_ID = '12345sabino';

  const fetchCountries = async () => {
    try {
      setLoadingCountries(true);
      setCountriesError('');

      const response = await fetch(`${API_BASE_URL}/api/auth/countries`);
      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setCountries(data.data);
      } else {
        setCountriesError('Failed to load countries');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch countries';
      setCountriesError(errorMessage);
    } finally {
      setLoadingCountries(false);
    }
  };

  const initializeBilling = async () => {
    try {
      if (!isMobilePlatform) {
        setLoadingBilling(false);
        return;
      }

      // Dynamic import to prevent Web bundling errors
      // @ts-ignore
      const InAppPurchases = await import('expo-in-app-purchases');
      await InAppPurchases.connectAsync();
      
      const { results } = await InAppPurchases.getProductsAsync([SUBSCRIPTION_ID]);
      if (results && results.length > 0) {
        setBillingPlan(results[0]);
      } else {
        setBillingError('Could not find the subscription product.');
      }
    } catch (err) {
      console.warn('InAppPurchases initialization info:', err);
    } finally {
      setLoadingBilling(false);
    }
  };

  const endBillingConnection = async () => {
    try {
      if (isMobilePlatform) {
        // @ts-ignore
        const InAppPurchases = await import('expo-in-app-purchases');
        await InAppPurchases.disconnectAsync();
      }
    } catch (err) {
      console.warn('Billing disconnect error:', err);
    }
  };

  useEffect(() => {
    fetchCountries();

    if (isMobilePlatform) {
      const setupListener = async () => {
        try {
          // @ts-ignore
          const InAppPurchases = await import('expo-in-app-purchases');
          InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }: any) => {
            if (responseCode === InAppPurchases.IAPResponseCode.OK && results && results.length > 0) {
              if (purchaseResolverRef.current) {
                purchaseResolverRef.current(results[0]);
              }
            } else {
              if (purchaseResolverRef.current) {
                const userCancelled = responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED;
                purchaseResolverRef.current({ responseCode, errorCode, userCancelled });
              }
            }
          });
        } catch (e) {
          console.warn('Listener setup failed', e);
        }
      };
      
      setupListener();
      initializeBilling();
    } else {
      setLoadingBilling(false);
    }

    return () => {
      endBillingConnection();
    };
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
    setRegistrationData({
      email,
      password: formData.password,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone || undefined,
      name: formData.schoolName,
      school_type: formData.schoolType,
      country: formData.country,
      countryId: formData.countryId,
    });
    setCurrentStep('payment');
    setError('');
  };

  const handlePaymentAndRegistration = async () => {
    setIsProcessingPayment(true);
    setBillingError('');

    if (!registrationData) {
      setBillingError('Missing registration data.');
      setIsProcessingPayment(false);
      return;
    }

    try {
      let accountData = null;
      let schoolId = null;
      let token = null;

      const createAccountResponse = await fetch(`${API_BASE_URL}/api/schools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...registrationData,
          paymentStatus: 'pending',
        }),
      });

      const createAccountData = await createAccountResponse.json();

      if (!createAccountResponse.ok) {
        setBillingError(createAccountData.error || 'Account creation failed');
        setIsProcessingPayment(false);
        return;
      }

      accountData = createAccountData.data;
      schoolId = accountData.user?.schoolId;
      token = createAccountData.token;
      setIsResumingPayment(!!createAccountData.resumePayment);

      if (!isMobilePlatform) {
        Alert.alert('Payment Required', 'Please use the mobile app to complete payment.');
        setIsProcessingPayment(false);
        return;
      }

      // @ts-ignore
      const InAppPurchases = await import('expo-in-app-purchases');
      const purchasePromise = new Promise((resolve) => {
        purchaseResolverRef.current = resolve;
      });

      await InAppPurchases.purchaseItemAsync(SUBSCRIPTION_ID);
      const purchase: any = await purchasePromise;
      purchaseResolverRef.current = null;

      if (purchase.purchaseToken) {
        await InAppPurchases.finishTransactionAsync(purchase, false);

        const updateResponse = await fetch(`${API_BASE_URL}/api/schools/${schoolId}/payment-status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            purchaseToken: purchase.purchaseToken,
            payment_status: 'completed',
          }),
        });

        if (!updateResponse.ok) {
          setBillingError('Failed to sync payment');
          setIsProcessingPayment(false);
          return;
        }

        const user = {
          schoolId,
          email: accountData.user?.email,
          name: accountData.user?.name,
          type: 'school',
          countryId: accountData.user?.countryId,
          country: registrationData.country,
          paymentStatus: 'completed',
        };

        try {
          await SecureStore.setItemAsync('userToken', token);
          await SecureStore.setItemAsync('userData', JSON.stringify(user));
        } catch (e) {
          localStorage.setItem('userToken', token);
          localStorage.setItem('userData', JSON.stringify(user));
        }

        Alert.alert('Success', 'Account activated!');
        router.replace('/dashboard');
        return;
      }

      setBillingError(purchase?.userCancelled ? 'Payment cancelled.' : 'Purchase failed.');
    } catch (err: any) {
      setBillingError(err.message || 'An error occurred');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleBackToForm = () => {
    setCurrentStep('form');
    setRegistrationData(null);
    setBillingError('');
  };

  return (
    <ThemedView style={{ flex: 1, position: 'relative' }}>
      {isResumingPayment && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.75)', justifyContent: 'center', alignItems: 'center', zIndex: 999 }}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={{ marginTop: 12, fontSize: 16, fontWeight: '600', color: '#1976d2' }}>Resuming account...</Text>
        </View>
      )}

      <ScrollView style={{ flex: 1, padding: 20 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {currentStep === 'form' && (
          <>
            <View style={{ marginBottom: 30 }}>
              <ThemedText type="title">Complete Registration</ThemedText>
              <ThemedText type="subtitle" style={{ opacity: 0.7 }}>Step 3: School & Admin Details</ThemedText>
            </View>

            {countriesError && (
              <View style={{ backgroundColor: '#ffebee', padding: 14, borderRadius: 6, marginBottom: 20 }}>
                <ThemedText style={{ color: '#c62828' }}>⚠️ Load Error: {countriesError}</ThemedText>
                <TouchableOpacity onPress={fetchCountries}><ThemedText style={{ color: '#d32f2f', fontWeight: '600', marginTop: 8 }}>🔄 Retry</ThemedText></TouchableOpacity>
              </View>
            )}

            {!loadingCountries && countries.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <ThemedText style={{ marginBottom: 6, fontWeight: '600' }}>Select Country *</ThemedText>
                <TouchableOpacity
                  style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 12, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between' }}
                  onPress={() => setShowCountryDropdown(!showCountryDropdown)}
                >
                  <ThemedText style={{ color: formData.country ? '#000' : '#999' }}>{formData.country || 'Choose a country...'}</ThemedText>
                  <ThemedText>{showCountryDropdown ? '▲' : '▼'}</ThemedText>
                </TouchableOpacity>

                {showCountryDropdown && (
                  <View style={{ borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff', maxHeight: 200 }}>
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
              <TextInput style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, backgroundColor: '#fff' }} value={formData.schoolName} onChangeText={(text) => setFormData({ ...formData, schoolName: text })} />
            </View>

            <View style={{ marginBottom: 16 }}>
              <ThemedText style={{ marginBottom: 6, fontWeight: '600' }}>First Name *</ThemedText>
              <TextInput style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, backgroundColor: '#fff' }} value={formData.firstName} onChangeText={(text) => setFormData({ ...formData, firstName: text })} />
            </View>

            <View style={{ marginBottom: 16 }}>
              <ThemedText style={{ marginBottom: 6, fontWeight: '600' }}>Last Name *</ThemedText>
              <TextInput style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, backgroundColor: '#fff' }} value={formData.lastName} onChangeText={(text) => setFormData({ ...formData, lastName: text })} />
            </View>

            <View style={{ marginBottom: 24 }}>
              <ThemedText style={{ marginBottom: 6, fontWeight: '600' }}>Password *</ThemedText>
              <TextInput secureTextEntry style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, backgroundColor: '#fff' }} value={formData.password} onChangeText={(text) => setFormData({ ...formData, password: text })} />
            </View>

            <View style={{ marginBottom: 24 }}>
              <ThemedText style={{ marginBottom: 6, fontWeight: '600' }}>Confirm Password *</ThemedText>
              <TextInput secureTextEntry style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, backgroundColor: '#fff' }} value={formData.confirmPassword} onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })} />
            </View>

            {error && <ThemedText style={{ color: 'red', marginBottom: 16 }}>{error}</ThemedText>}

            <TouchableOpacity style={{ backgroundColor: '#4CAF50', padding: 16, borderRadius: 8, alignItems: 'center' }} onPress={handleCompleteRegistration}>
              <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Next: Complete Payment</ThemedText>
            </TouchableOpacity>
          </>
        )}

        {currentStep === 'payment' && (
          <>
            <View style={{ marginBottom: 30 }}>
              <ThemedText type="title">Activate Account</ThemedText>
              <ThemedText type="subtitle" style={{ opacity: 0.7 }}>{isResumingPayment ? 'Complete pending subscription' : 'Start your subscription'}</ThemedText>
            </View>

            {billingError && (
              <View style={{ backgroundColor: '#ffebee', padding: 14, borderRadius: 6, marginBottom: 20 }}>
                <ThemedText style={{ color: '#c62828' }}>⚠️ {billingError}</ThemedText>
              </View>
            )}

            {billingPlan ? (
              <View style={{ backgroundColor: '#f5f5f5', padding: 20, borderRadius: 8, marginBottom: 30, borderWidth: 2, borderColor: '#4CAF50' }}>
                <ThemedText style={{ fontSize: 18, fontWeight: 'bold', color: '#4CAF50' }}>📱 {billingPlan.title}</ThemedText>
                <ThemedText style={{ fontSize: 24, fontWeight: 'bold' }}>{billingPlan.priceText}</ThemedText>
                <ThemedText>{billingPlan.description}</ThemedText>
              </View>
            ) : (
              <ActivityIndicator color="#1976d2" size="large" />
            )}

            <TouchableOpacity
              style={{ backgroundColor: isProcessingPayment || loadingBilling ? '#ccc' : '#4CAF50', padding: 16, borderRadius: 8, alignItems: 'center' }}
              onPress={handlePaymentAndRegistration}
              disabled={isProcessingPayment || loadingBilling || !billingPlan}
            >
              <ThemedText style={{ color: '#fff' }}>{isProcessingPayment ? 'Processing...' : 'Subscribe & Activate'}</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={handleBackToForm}>
              <ThemedText style={{ color: '#666' }}>← Back to Form</ThemedText>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}
