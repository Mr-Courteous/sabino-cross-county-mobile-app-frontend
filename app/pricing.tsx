/**
 * pricing.tsx — Subscription Renewal / Paywall
 *
 * Shown automatically when the backend returns a 402 (subscription expired/inactive).
 * The user is already registered — this is a renewal-only screen.
 *
 * Mobile (Android/iOS): purchases via Google Play / App Store through RevenueCat,
 *                        OR via Flutterwave web checkout (cards, bank transfer, USSD).
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
  Linking,
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
import { clearAllStorage } from '@/utils/storage';
import { API_BASE_URL } from '@/utils/api-service';

// ─── RevenueCat API key ────────────────────────────────────────────────────────
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

  // ── Web checkout fallback state ──────────────────────────────────────────────
  const [webPayLoading, setWebPayLoading] = useState(false);
  const [webPayTxRef, setWebPayTxRef] = useState('');
  const [webPayLinkOpened, setWebPayLinkOpened] = useState(false);
  const [webPayVerifying, setWebPayVerifying] = useState(false);
  const [webPayError, setWebPayError] = useState('');

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
            userId = (parsed?.schoolId || parsed?.id || parsed?.school_id)?.toString();
          } catch (e) {
            console.error('[Pricing] Failed to parse userData', e);
          }
        }

        Purchases.configure({ apiKey: RC_GOOGLE_API_KEY, appUserID: userId });

        const offerings = await Purchases.getOfferings();
        const current = offerings.current;

        if (!cancelled && current && current.availablePackages.length > 0) {
          setRcPackage(current.availablePackages[0]);
        }
        // If no package found we simply don't set rcPackage — web checkout remains the primary option
      } catch (err: any) {
        if (!cancelled) {
          console.error('[Pricing] RevenueCat error:', err.message);
          // Non-fatal: web checkout will serve as the fallback
        }
      } finally {
        if (!cancelled) setLoadingPackage(false);
      }
    };

    loadOffering();
    return () => { cancelled = true; };
  }, []);

  const syncSubscriptionWithBackend = async () => {
    try {
      const token = Platform.OS !== 'web'
        ? await SecureStore.getItemAsync('userToken')
        : localStorage.getItem('userToken');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/schools/sync-subscription`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      console.log('[Pricing] Sync result:', data);
    } catch (err) {
      console.warn('[Pricing] Sync failed, webhook will handle it:', err);
    }
  };

  // ── Purchase via RevenueCat ──────────────────────────────────────────────────
  const handlePurchase = async () => {
    if (!isMobilePlatform || !rcPackage) return;

    setError('');
    setPurchasing(true);
    setStep('purchasing');

    try {
      const { customerInfo } = await Purchases.purchasePackage(rcPackage);
      const isActive = Object.keys(customerInfo.entitlements.active).length > 0;

      if (isActive) {
        await syncSubscriptionWithBackend();
        setStep('success');
        setTimeout(() => router.replace('/dashboard' as any), 1500);
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
        await syncSubscriptionWithBackend();
        setStep('success');
        setTimeout(() => router.replace('/dashboard' as any), 1500);
      } else {
        setError('No active subscriptions found.');
      }
    } catch (err: any) {
      setError(err.message || 'Restore failed.');
    } finally {
      setPurchasing(false);
    }
  };

  // ── Web checkout: Step 1 — get Flutterwave link, open in browser ─────────────
  const handleWebCheckout = async () => {
    setWebPayError('');
    setWebPayLinkOpened(false);
    setWebPayTxRef('');
    setWebPayLoading(true);
    try {
      const token = Platform.OS !== 'web'
        ? await SecureStore.getItemAsync('userToken')
        : localStorage.getItem('userToken');

      const res = await fetch(`${API_BASE_URL}/api/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan_id: 1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not generate payment link.');
      if (!data.link) throw new Error('Server did not return a payment link.');

      if (data.tx_ref) setWebPayTxRef(data.tx_ref);
      await Linking.openURL(data.link);
      setWebPayLinkOpened(true);
    } catch (err: any) {
      setWebPayError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setWebPayLoading(false);
    }
  };

  // ── Web checkout: Step 2 — user returns from browser, verify payment ──────────
  const handleWebCheckoutVerify = async () => {
    if (!webPayTxRef) {
      setWebPayError('Transaction reference missing. Please contact support.');
      return;
    }
    setWebPayError('');
    setWebPayVerifying(true);
    try {
      const token = Platform.OS !== 'web'
        ? await SecureStore.getItemAsync('userToken')
        : localStorage.getItem('userToken');

      const res = await fetch(`${API_BASE_URL}/api/payments/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tx_ref: webPayTxRef }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed. Please wait a moment and try again.');

      setStep('success');
      setTimeout(() => router.replace('/dashboard' as any), 1500);
    } catch (err: any) {
      setWebPayError(err.message || 'Could not verify payment. Please try again.');
    } finally {
      setWebPayVerifying(false);
    }
  };

  const handleLogout = async () => {
    try {
      await clearAllStorage();
      router.replace('/');
    } catch (e) {
      setError('Failed to clear session.');
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
            {/* Header */}
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

              {/* ════════════════════════════════ INFO STEP ═══════════════════════════════ */}
              {step === 'info' && (
                <>
                  <Text style={styles.cardTitle}>Account Expired</Text>
                  <Text style={styles.cardSubtitle}>
                    Renew your subscription to maintain access to your school records and premium features.
                  </Text>

                  {isMobilePlatform ? (
                    <View style={{ alignItems: 'center', width: '100%' }}>

                      {/* ── Google Play / RevenueCat ──────────────────────────────────────── */}
                      {loadingPackage ? (
                        <ActivityIndicator color="#FACC15" style={{ marginVertical: 20 }} />
                      ) : rcPackage ? (
                        <>
                          <View style={styles.priceTag}>
                            <Text style={styles.priceLabel}>Premium School Plan</Text>
                            <Text style={styles.priceValue}>{rcPackage.product.priceString}</Text>
                            <Text style={styles.pricePeriod}>Billed Every Four Months</Text>
                          </View>

                          <CustomButton
                            title={purchasing ? 'PROCESSING...' : 'RENEW VIA GOOGLE PLAY'}
                            onPress={handlePurchase}
                            disabled={purchasing}
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
                      ) : null}

                      {/* ── School Billing Portal (B2B alternative) ───────────────────── */}
                      <View style={styles.webPayDivider}>
                        <View style={styles.webPayDividerLine} />
                        <Text style={styles.webPayDividerText}>INSTITUTIONAL BILLING</Text>
                        <View style={styles.webPayDividerLine} />
                      </View>

                      <Text style={styles.webPayHint}>
                        Schools and institutions can complete payment via bank transfer, card,
                        USSD, or mobile money through our secure school billing portal.
                      </Text>

                      {/* Step 1: generate link and open in browser */}
                      {!webPayLinkOpened && (
                        <TouchableOpacity
                          style={[styles.webPayButton, webPayLoading && { opacity: 0.6 }]}
                          onPress={handleWebCheckout}
                          disabled={webPayLoading || purchasing}
                          activeOpacity={0.8}
                        >
                          {webPayLoading ? (
                            <ActivityIndicator color="#0F172A" size="small" />
                          ) : (
                            <>
                              <Ionicons name="globe-outline" size={14} color="#0F172A" style={{ marginRight: 6 }} />
                              <Text style={styles.webPayButtonText}>PAY VIA SCHOOL BILLING PORTAL</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {/* Step 2: user returns from browser and confirms payment */}
                      {webPayLinkOpened && (
                        <View style={{ width: '100%', alignItems: 'center' }}>
                          <Text style={styles.webPayReturnHint}>
                            Once your institution has completed payment through the billing portal, tap below to activate your account.
                          </Text>
                          <TouchableOpacity
                            style={[styles.webPayVerifyButton, webPayVerifying && { opacity: 0.6 }]}
                            onPress={handleWebCheckoutVerify}
                            disabled={webPayVerifying}
                            activeOpacity={0.8}
                          >
                            {webPayVerifying ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-circle-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
                                <Text style={styles.webPayVerifyText}>CONFIRM INSTITUTIONAL PAYMENT</Text>
                              </>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ marginTop: 10 }}
                            onPress={handleWebCheckout}
                            disabled={webPayLoading}
                          >
                            <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700', textDecorationLine: 'underline' }}>
                              Re-open payment page
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {webPayError ? (
                        <Text style={{ color: '#F87171', fontSize: 12, marginTop: 10, textAlign: 'center', fontWeight: '600' }}>
                          {webPayError}
                        </Text>
                      ) : null}

                    </View>
                  ) : (
                    // Web/desktop browser — Flutterwave web checkout works here too
                    <View style={{ alignItems: 'center', width: '100%' }}>
                      <View style={styles.priceTag}>
                        <Text style={styles.priceLabel}>Premium School Plan</Text>
                        <Text style={styles.priceValue}>Renew Now</Text>
                        <Text style={styles.pricePeriod}>Billed Every Four Months</Text>
                      </View>

                      <Text style={styles.webPayHint}>
                        Schools and institutions can complete payment via bank transfer, card,
                        USSD, or mobile money through our secure school billing portal                      </Text>

                      {/* Step 1: open Flutterwave in browser / new tab */}
                      {!webPayLinkOpened && (
                        <TouchableOpacity
                          style={[styles.webPayButton, webPayLoading && { opacity: 0.6 }]}
                          onPress={handleWebCheckout}
                          disabled={webPayLoading}
                          activeOpacity={0.8}
                        >
                          {webPayLoading ? (
                            <ActivityIndicator color="#0F172A" size="small" />
                          ) : (
                            <>
                              <Ionicons name="globe-outline" size={14} color="#0F172A" style={{ marginRight: 6 }} />
                              <Text style={styles.webPayButtonText}>PAY VIA SCHOOL BILLING PORTAL</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {/* Step 2: user returns from payment tab and confirms */}
                      {webPayLinkOpened && (
                        <View style={{ width: '100%', alignItems: 'center' }}>
                          <Text style={styles.webPayReturnHint}>
                            Once your institution has completed payment through the billing portal, tap below to activate your account.
                          </Text>
                          <TouchableOpacity
                            style={[styles.webPayVerifyButton, webPayVerifying && { opacity: 0.6 }]}
                            onPress={handleWebCheckoutVerify}
                            disabled={webPayVerifying}
                            activeOpacity={0.8}
                          >
                            {webPayVerifying ? (
                              <ActivityIndicator color="#fff" size="small" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-circle-outline" size={14} color="#fff" style={{ marginRight: 6 }} />
                                <Text style={styles.webPayVerifyText}>CONFIRM INSTITUTIONAL PAYMENT</Text>
                              </>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ marginTop: 10 }}
                            onPress={handleWebCheckout}
                            disabled={webPayLoading}
                          >
                            <Text style={{ color: '#64748B', fontSize: 11, fontWeight: '700', textDecorationLine: 'underline' }}>
                              Re-open payment page
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {webPayError ? (
                        <Text style={{ color: '#F87171', fontSize: 12, marginTop: 10, textAlign: 'center', fontWeight: '600' }}>
                          {webPayError}
                        </Text>
                      ) : null}
                    </View>
                  )}

                  <View style={styles.logoutDivider} />
                  <TouchableOpacity
                    style={styles.switchAccountBtn}
                    onPress={handleLogout}
                    disabled={purchasing}
                  >
                    <Ionicons name="log-out-outline" size={16} color="#94A3B8" />
                    <Text style={styles.switchAccountText}>Switch Account / Logout</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ════════════════════════════ PURCHASING STEP ════════════════════════════ */}
              {step === 'purchasing' && (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color="#FACC15" />
                  <Text style={styles.loadingTitle}>Connecting to Store...</Text>
                  <Text style={styles.loadingSubtitle}>Please complete the payment in the system dialog.</Text>
                </View>
              )}

              {/* ═════════════════════════════ SUCCESS STEP ══════════════════════════════ */}
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
      borderColor: 'rgba(255,255,255,0.1)',
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
      marginBottom: 30,
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
      marginBottom: 16,
      width: '100%',
    },
    priceLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 4 },
    priceValue: { color: '#fff', fontSize: 32, fontWeight: '900' },
    pricePeriod: { color: '#64748B', fontSize: 12, marginTop: 4 },

    ctaButton: { height: 54, borderRadius: 12, width: '100%', marginTop: 10 },

    restoreBtn: { marginTop: 20, marginBottom: 4, alignSelf: 'center' },
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

    logoutDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', width: '100%', marginVertical: 20 },
    switchAccountBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      opacity: 0.8,
    },
    switchAccountText: { color: '#94A3B8', fontSize: 13, fontWeight: '700', marginLeft: 8 },

    // ── Web checkout / Flutterwave styles ────────────────────────────────────────
    webPayDivider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 28,
      marginBottom: 12,
      width: '100%',
    },
    webPayDividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
    webPayDividerText: {
      color: '#475569',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1.5,
      marginHorizontal: 10,
    },
    webPayHint: {
      color: '#64748B',
      fontSize: 11,
      fontWeight: '500',
      textAlign: 'center',
      marginBottom: 14,
      lineHeight: 16,
    },
    webPayButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FACC15',
      borderRadius: 10,
      paddingVertical: 13,
      paddingHorizontal: 20,
      width: '100%',
    },
    webPayButtonText: { color: '#0F172A', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    webPayReturnHint: {
      color: '#94A3B8',
      fontSize: 11,
      textAlign: 'center',
      marginBottom: 12,
      lineHeight: 16,
      fontWeight: '500',
    },
    webPayVerifyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#10B981',
      borderRadius: 10,
      paddingVertical: 13,
      paddingHorizontal: 20,
      width: '100%',
    },
    webPayVerifyText: { color: '#fff', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  });
}