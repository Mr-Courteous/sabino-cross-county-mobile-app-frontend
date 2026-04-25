import { View, ActivityIndicator, ScrollView, Alert, Platform, FlatList, ImageBackground, StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
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
import {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
} from '@/constants/design-system';

const { width } = Dimensions.get('window');
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

  // BILLING STATE
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [statusAlert, setStatusAlert] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
  });

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
          if (result.data) {
            setFormData(prev => ({ ...prev, schoolName: result.data.name || prev.schoolName }));
            setSchoolId(result.data.schoolId);
          }
          setCurrentStep('payment');
        } else if (result.data?.paymentStatus === 'completed') {
          setStatusAlert({
            visible: true,
            type: 'info',
            title: 'Already Active',
            message: 'This school is already active. Please login.',
            onConfirm: () => router.replace('/(auth)')
          });
        }
      }
    } catch (err) {
    } finally {
      setTimeout(() => setCheckingAccount(false), 800);
    }
  };

  const setupRevenueCat = async () => {
    try {
      Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
      if (Platform.OS === 'ios') {
        await Purchases.configure({ apiKey: REVENUECAT_APPLE_API_KEY });
      } else {
        await Purchases.configure({ apiKey: REVENUECAT_GOOGLE_API_KEY });
      }
    } catch (e: any) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'Billing Service',
        message: 'Failed to connect to billing service.'
      });
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

      const accountData = responseData.data;
      const sId = accountData.user?.schoolId;

      if (isMobilePlatform && sId) {
        await Purchases.logIn(sId.toString());
      }

      setSchoolId(sId);
      setCurrentStep('payment');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!isMobilePlatform) {
      setStatusAlert({
        visible: true,
        type: 'warning',
        title: 'Platform Not Supported',
        message: 'Billing is only supported on mobile devices.'
      });
      return;
    }

    setIsProcessingPayment(true);
    try {
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;
      if (!currentOffering) throw new Error('No offerings available.');

      const packageToPurchase = currentOffering.monthly ?? currentOffering.availablePackages[0];
      if (!packageToPurchase) throw new Error('No purchasable package found.');

      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);

      if (customerInfo.entitlements.active['Sabinoschool'] !== undefined) {
        setStatusAlert({
          visible: true,
          type: 'success',
          title: 'Success',
          message: 'Account Activated!',
          onConfirm: () => router.replace('/dashboard')
        });
      } else {
        throw new Error('Purchase completed but no entitlement was granted.');
      }
    } catch (err: any) {
      if (!err.userCancelled) {
        setStatusAlert({
          visible: true,
          type: 'error',
          title: 'Subscription Error',
          message: err.message || 'Payment failed'
        });
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <ThemedView style={{ flex: 1, backgroundColor: Colors.accent.navy }}>
      <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=2071' }}
          style={styles.hero}
      >
        <LinearGradient
            colors={['rgba(10, 15, 30, 0.8)', 'rgba(15, 23, 42, 0.98)']}
            style={styles.overlay}
        >
          <ScrollView
              contentContainerStyle={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
          >
              {statusAlert.visible && (
                <CustomAlert
                  type={statusAlert.type}
                  title={statusAlert.title}
                  message={statusAlert.message}
                  onClose={() => setStatusAlert({ ...statusAlert, visible: false })}
                  onConfirm={statusAlert.onConfirm}
                  style={{ marginBottom: 20 }}
                />
              )}
                <View style={styles.header}>
                    <View style={styles.logoBadge}>
                        <Ionicons name="ribbon" size={24} color="#FACC15" />
                        <Text style={styles.logoText}>SABINO PORTAL</Text>
                    </View>
                    <Text style={styles.title}>{currentStep === 'form' ? 'School Details' : 'Final Step'}</Text>
                    <View style={styles.goldBar} />
                    <Text style={styles.subtitle}>
                        {currentStep === 'form' ? 'Step 3: Setup your administrative profile' : 'Step 4: Activate your institution'}
                    </Text>
                </View>

                {currentStep === 'form' ? (
                  <View style={styles.card}>
                    {error && (
                      <CustomAlert
                          type="error"
                          title="Form Error"
                          message={error}
                          onClose={() => setError('')}
                          style={{ marginBottom: 20 }}
                      />
                    )}

                    {!loadingCountries && countries.length > 0 && (
                      <View style={{ marginBottom: 15 }}>
                        <Text style={styles.inputLabel}>Country *</Text>
                        <TouchableOpacity
                          style={styles.dropdown}
                          onPress={() => setShowCountryDropdown(!showCountryDropdown)}
                        >
                          <Text style={[styles.dropdownText, !formData.country && { color: '#64748B' }]}>
                            {formData.country || 'Select your country'}
                          </Text>
                          <Ionicons name={showCountryDropdown ? "chevron-up" : "chevron-down"} size={20} color="#FACC15" />
                        </TouchableOpacity>

                        {showCountryDropdown && (
                          <View style={styles.dropdownList}>
                            <FlatList
                              data={countries}
                              keyExtractor={(item) => String(item.id)}
                              renderItem={({ item }) => (
                                <TouchableOpacity
                                  style={styles.dropdownItem}
                                  onPress={() => {
                                    setFormData({ ...formData, country: item.name, countryId: item.id });
                                    setShowCountryDropdown(false);
                                  }}
                                >
                                  <Text style={styles.dropdownItemText}>{item.name}</Text>
                                </TouchableOpacity>
                              )}
                              nestedScrollEnabled
                            />
                          </View>
                        )}
                      </View>
                    )}

                    <CustomInput
                      label="School Name *"
                      placeholder="Enter legal school name"
                      value={formData.schoolName}
                      onChangeText={(text) => setFormData({ ...formData, schoolName: text })}
                      containerStyle={styles.inputContainer}
                    />

                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <CustomInput
                          label="First Name *"
                          placeholder="Admin first name"
                          value={formData.firstName}
                          onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                          containerStyle={styles.inputContainer}
                        />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <CustomInput
                          label="Last Name *"
                          placeholder="Admin last name"
                          value={formData.lastName}
                          onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                          containerStyle={styles.inputContainer}
                        />
                      </View>
                    </View>

                    <CustomInput
                      label="Phone Number"
                      placeholder="+234 ..."
                      keyboardType="phone-pad"
                      value={formData.phone}
                      onChangeText={(text) => setFormData({ ...formData, phone: text })}
                      containerStyle={styles.inputContainer}
                    />

                    <CustomInput
                      label="Password *"
                      placeholder="Access security"
                      isPassword
                      value={formData.password}
                      onChangeText={(text) => setFormData({ ...formData, password: text })}
                      containerStyle={styles.inputContainer}
                    />

                    <CustomInput
                      label="Confirm Password *"
                      placeholder="Verify security"
                      isPassword
                      value={formData.confirmPassword}
                      onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
                      containerStyle={styles.inputContainer}
                    />

                    <CustomButton
                      title={loading ? "SAVING..." : "CONTINUE TO ACTIVATION"}
                      onPress={handleCompleteRegistration}
                      disabled={loading}
                      loading={loading}
                      variant="premium"
                      style={styles.ctaButton}
                    />
                  </View>
                ) : (
                  <View style={styles.card}>
                    {/* <View style={styles.pricingHeader}>
                        <Text style={styles.pricingTitle}>SABINO SCHOOL PORTAL</Text>
                        <Text style={styles.pricingAmount}>₦5,000<Text style={{ fontSize: 16 }}>/mo</Text></Text>
                    </View> */}
                    
                    <View style={styles.featureBox}>
                        <PricingFeature text="Full Student Registry Access" />
                        <PricingFeature text="Instant Result Ranking" />
                        <PricingFeature text="Automated Report Generation" />
                        <PricingFeature text="Secure Digital Identity" />
                    </View>

                    <CustomButton
                      title="ACTIVATE VIA MOBILE STORE"
                      onPress={handlePurchase}
                      disabled={isProcessingPayment}
                      loading={isProcessingPayment}
                      variant="premium"
                      style={styles.paymentButton}
                    />

                    <TouchableOpacity onPress={() => setCurrentStep('form')} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={16} color="#94A3B8" />
                        <Text style={styles.backButtonText}>EDIT DETAILS</Text>
                    </TouchableOpacity>
                  </View>
                )}
          </ScrollView>

            <View style={styles.footer}>
                <Text style={styles.footerText}>THE GOLD STANDARD FOR ACADEMIC REPORTING</Text>
            </View>
          </LinearGradient>
        </ImageBackground>
      </ThemedView>
  );
}

function PricingFeature({ text }: { text: string }) {
    return (
        <View style={styles.pricingFeature}>
            <Ionicons name="checkmark-circle" size={20} color="#FACC15" />
            <Text style={styles.pricingFeatureText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    hero: { flex: 1, width: '100%' },
    overlay: { flex: 1, paddingHorizontal: 24 },
    scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingVertical: 40 },
    loadingContainer: { alignItems: 'center', marginVertical: 100 },
    loadingText: { color: '#FACC15', fontWeight: '900', marginTop: 20, letterSpacing: 2 },
    
    header: { alignItems: 'center', marginBottom: 30 },
    logoBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    logoText: { color: '#FACC15', fontSize: 13, fontWeight: '900', marginLeft: 10, letterSpacing: 3 },
    title: { fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: -1 },
    goldBar: { width: 50, height: 4, backgroundColor: '#FACC15', borderRadius: 2, marginVertical: 15 },
    subtitle: { fontSize: 14, color: '#94A3B8', fontWeight: '500', textAlign: 'center' },

    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 35,
        padding: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    row: { flexDirection: 'row' },
    inputContainer: {
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 12,
    },
    inputLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 8, marginLeft: 4 },
    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        padding: 18,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 10,
    },
    dropdownText: { color: '#F8FAFC', fontWeight: '500' },
    dropdownList: {
        backgroundColor: '#1E293B',
        borderRadius: BorderRadius.lg,
        marginTop: -5,
        marginBottom: 15,
        maxHeight: 200,
        ...Shadows.lg
    },
    dropdownItem: { padding: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    dropdownItemText: { color: '#F8FAFC' },
    
    ctaButton: { height: 60, borderRadius: 15, marginTop: 10 },
    
    pricingHeader: { alignItems: 'center', marginBottom: 25 },
    pricingTitle: { color: '#FACC15', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
    pricingAmount: { color: '#fff', fontSize: 40, fontWeight: '900', marginTop: 10 },
    featureBox: { marginBottom: 30 },
    pricingFeature: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    pricingFeatureText: { color: '#E2E8F0', marginLeft: 12, fontSize: 15, fontWeight: '500' },
    paymentButton: { height: 65, borderRadius: 20, backgroundColor: '#2563EB' },
    backButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 25 },
    backButtonText: { color: '#94A3B8', fontSize: 12, fontWeight: '800', marginLeft: 8, letterSpacing: 1 },
    
    footer: { marginTop: 30, alignItems: 'center' },
    footerText: { color: '#334155', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
