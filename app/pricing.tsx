/**
 * pricing.tsx — Subscription Renewal / Paywall
 *
 * Shown automatically when the backend returns a 402 (subscription expired/inactive).
 * The user is already registered — this is a renewal-only screen.
 *
 * Mobile (Android/iOS): purchases via Google Play / App Store through RevenueCat.
 * Web: shows a contact/support message (in-app billing isn't available on web).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StyleSheet,
  useWindowDimensions,
  ImageBackground,
  Text,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { Colors } from '@/constants/design-system';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CustomButton } from '@/components/custom-button';
import { CustomAlert } from '@/components/custom-alert';

// ─── RevenueCat API key (from complete-registration.tsx) ────────────
const RC_GOOGLE_API_KEY = 'goog_DoercEbvtNXRhqfTjOYMkzCJKlX';

const isMobilePlatform = Platform.OS === 'android' || Platform.OS === 'ios';

export default function PricingPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(width), [width]);

  const [step, setStep] = useState<'info' | 'purchasing' | 'success'>('info');
  const [rcPackage, setRcPackage] = useState<PurchasesPackage | null>(null);
  const [loadingPackage, setLoadingPackage] = useState(isMobilePlatform);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');

  // ── Configure RevenueCat & load offerings ───────────────────────────────────
  useEffect(() => {
    if (!isMobilePlatform) {
      setLoadingPackage(false);
      return;
    }

    let cancelled = false;

    const loadOffering = async () => {
      try {
        const userData = Platform.OS !== 'web'
          ? await SecureStore.getItemAsync('userData')
          : null;
        
        let userId = undefined;
        if (userData) {
          try {
            const parsed = JSON.parse(userData);
            // Ensure we use the exact ID that matches the schools table 'id'
            userId = (parsed?.schoolId || parsed?.id || parsed?.school_id)?.toString();
            console.log(`👤 [Pricing] Identifying user as: ${userId}`);
          } catch (e) {
            console.error('[Pricing] Failed to parse userData', e);
          }
        }

        Purchases.configure({ apiKey: RC_GOOGLE_API_KEY, appUserID: userId });

        const offerings = await Purchases.getOfferings();
        const current = offerings.current;

        if (!cancelled && current && current.availablePackages.length > 0) {
          setRcPackage(current.availablePackages[0]);
        } else if (!cancelled) {
          setError('No active subscription plans found.');
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[Pricing] RevenueCat error:', err.message);
          setError('Could not connect to store. Please check your internet.');
        }
      } finally {
        if (!cancelled) setLoadingPackage(false);
      }
    };

    loadOffering();
    return () => { cancelled = true; };
  }, []);

  // ── Purchase via RevenueCat ──────────────────────────────────────────────────
  const handlePurchase = async () => {
    if (!isMobilePlatform) return;
    if (!rcPackage) return;

    setError('');
    setPurchasing(true);
    setStep('purchasing');

    try {
      const { customerInfo } = await Purchases.purchasePackage(rcPackage);
      const isActive = Object.keys(customerInfo.entitlements.active).length > 0;

      if (isActive) {
        setStep('success');
        // Auto-redirect to dashboard after a short delay to show success state
        setTimeout(() => {
          router.replace('/dashboard' as any);
        }, 1500);
      } else {
        throw new Error('Payment completed but access not yet activated. Try restoring.');
      }
    } catch (err: any) {
      if (err?.userCancelled) {
        setStep('info');
        setPurchasing(false);
        return;
      }
      setError(err.message || 'Payment failed.');
      setStep('info');
    } finally {
      setPurchasing(false);
    }
  };

  // ── Restore existing purchase ────────────────────────────────────────────────
  const handleRestore = async () => {
    if (!isMobilePlatform) return;
    setError('');
    setPurchasing(true);

    try {
      const customerInfo = await Purchases.restorePurchases();
      const isActive = Object.keys(customerInfo.entitlements.active).length > 0;

      if (isActive) {
        setStep('success');
        setTimeout(() => {
          router.replace('/dashboard' as any);
        }, 1500);
      } else {
        setError('No active subscriptions found.');
      }
    } catch (err: any) {
      setError(err.message || 'Restore failed.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <ThemedView style={styles.root}>
      <StatusBar style="light" />
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029' }}
        style={styles.hero}
      >
        <LinearGradient
          colors={['rgba(10,15,30,0.85)', 'rgba(15,23,42,0.99)']}
          style={styles.overlay}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header section matching complete-registration style */}
            <View style={styles.header}>
              <View style={styles.logoBadge}>
                <Ionicons name="ribbon" size={20} color="#FACC15" />
                <Text style={styles.logoText}>SABINO EDU</Text>
              </View>
              <Text style={styles.title}>Subscription Renewal</Text>
              <View style={styles.goldBar} />
            </View>

            <View style={styles.card}>
              {error ? (
                <CustomAlert
                  type="error"
                  title="Error"
                  message={error}
                  onClose={() => setError('')}
                  style={{ marginBottom: 16 }}
                />
              ) : null}

              {step === 'info' && (
                <>
                  <Text style={styles.cardTitle}>Account Expired</Text>
                  <Text style={styles.cardSubtitle}>
                    Renew your annual subscription to maintain access to your school records and premium features.
                  </Text>

                  {isMobilePlatform ? (
                    <>
                      {loadingPackage ? (
                        <ActivityIndicator color="#FACC15" style={{ marginVertical: 20 }} />
                      ) : (
                        <>
                          {rcPackage && (
                            <View style={styles.priceTag}>
                              <Text style={styles.priceLabel}>Premium School Plan</Text>
                              <Text style={styles.priceValue}>{rcPackage.product.priceString}</Text>
                              <Text style={styles.pricePeriod}>Billed annually</Text>
                            </View>
                          )}

                          <CustomButton
                            title={purchasing ? "PROCESSING..." : "RENEW SUBSCRIPTION"}
                            onPress={handlePurchase}
                            disabled={!rcPackage || purchasing}
                            loading={purchasing}
                            variant="premium"
                            style={styles.ctaButton}
                          />

                          <TouchableOpacity
                            style={styles.restoreBtn}
                            onPress={handleRestore}
                            disabled={purchasing}
                          >
                            <Text style={styles.restoreText}>Restore Purchases</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </>
                  ) : (
                    <View style={styles.webFallback}>
                      <Ionicons name="phone-portrait" size={48} color="#FACC15" />
                      <Text style={styles.webFallbackTitle}>Mobile App Required</Text>
                      <Text style={styles.webFallbackText}>
                        Subscriptions are managed via the Sabino Edu mobile app on Android or iOS. Please open the app to renew your plan.
                      </Text>
                    </View>
                  )}
                </>
              )}

              {step === 'purchasing' && (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color="#FACC15" />
                  <Text style={styles.loadingTitle}>Connecting to Store...</Text>
                  <Text style={styles.loadingSubtitle}>Please complete the payment in the system dialog.</Text>
                </View>
              )}

              {step === 'success' && (
                <View style={styles.centered}>
                  <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                  <Text style={styles.successTitle}>Payment Successful!</Text>
                  <Text style={styles.successSubtitle}>Your school account is now fully active.</Text>
                  <CustomButton
                    title="OPEN DASHBOARD"
                    onPress={() => router.replace('/dashboard' as any)}
                    variant="premium"
                    style={styles.ctaButton}
                  />
                </View>
              )}
            </View>

            <Text style={styles.footerText}>SECURE RENEWAL SYSTEM • SABINO EDU</Text>
          </ScrollView>
        </LinearGradient>
      </ImageBackground>
    </ThemedView>
  );
}

function makeStyles(width: number) {
  const isSmall = width < 380;
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: '#0F172A' },
    hero: { width: '100%', minHeight: '100%' },
    overlay: { flex: 1, paddingHorizontal: isSmall ? 16 : 24 },
    scrollContent: {
      flexGrow: 1,
      paddingTop: isSmall ? 40 : 60,
      paddingBottom: 40,
      alignItems: 'center',
    },
    header: { alignItems: 'center', marginBottom: 30 },
    logoBadge: { 
      flexDirection: 'row', 
      alignItems: 'center', 
      backgroundColor: 'rgba(255,255,255,0.08)', 
      paddingHorizontal: 12, 
      paddingVertical: 8, 
      borderRadius: 10, 
      marginBottom: 16, 
      borderWidth: 1, 
      borderColor: 'rgba(255,255,255,0.1)' 
    },
    logoText: { color: '#FACC15', fontSize: 11, fontWeight: '900', marginLeft: 8, letterSpacing: 2 },
    title: { fontSize: isSmall ? 26 : 30, fontWeight: '900', color: '#fff', letterSpacing: -1 },
    goldBar: { width: 40, height: 3, backgroundColor: '#FACC15', borderRadius: 2, marginVertical: 12 },
    
    card: { 
      width: '100%',
      backgroundColor: 'rgba(30, 41, 59, 0.7)', 
      borderRadius: 28, 
      padding: isSmall ? 20 : 26, 
      borderWidth: 1, 
      borderColor: 'rgba(255,255,255,0.1)',
      marginBottom: 30
    },
    cardTitle: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
    cardSubtitle: { color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
    
    priceTag: {
      backgroundColor: 'rgba(250,204,21,0.08)',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: 'rgba(250,204,21,0.2)',
      padding: 20,
      alignItems: 'center',
      marginBottom: 20
    },
    priceLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 4 },
    priceValue: { color: '#fff', fontSize: 32, fontWeight: '900' },
    pricePeriod: { color: '#64748B', fontSize: 12, marginTop: 4 },
    
    ctaButton: { height: 54, borderRadius: 12, width: '100%', marginTop: 10 },
    
    restoreBtn: { marginTop: 20, alignSelf: 'center' },
    restoreText: { color: '#64748B', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
    
    webFallback: { alignItems: 'center', paddingVertical: 20 },
    webFallbackTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 16, marginBottom: 8 },
    webFallbackText: { color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 20 },
    
    centered: { alignItems: 'center', paddingVertical: 30 },
    loadingTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 20 },
    loadingSubtitle: { color: '#94A3B8', fontSize: 14, marginTop: 8, textAlign: 'center' },
    
    successTitle: { color: '#10B981', fontSize: 22, fontWeight: '900', marginTop: 20 },
    successSubtitle: { color: '#94A3B8', fontSize: 14, marginTop: 8, marginBottom: 20, textAlign: 'center' },
    
    footerText: { color: '#334155', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 20 },
  });
}
