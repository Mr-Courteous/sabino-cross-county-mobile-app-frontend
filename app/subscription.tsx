import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppColors } from '@/hooks/use-app-colors';

type SubscriptionInfo = {
  status: string;
  isTrial: boolean;
  daysLeft: number;
  hoursLeft: number;
  expiresAt: string | null;
};

export default function SubscriptionPage() {
  const router = useRouter();
  const C = useAppColors();
  const styles = makeStyles(C);
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadSubscription = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const token = Platform.OS === 'web'
        ? localStorage.getItem('userToken')
        : await SecureStore.getItemAsync('userToken');

      if (!token) {
        router.replace('/(auth)' as any);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/schools/subscription-info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Could not load subscription details.');
      }
      setInfo(result.data);
    } catch (loadError: any) {
      setError(loadError?.message || 'Could not load subscription details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => {
    loadSubscription();
  }, [loadSubscription]));

  const isPaidActive = !!info && !info.isTrial && ['completed', 'grace_period'].includes(info.status);
  const statusColor = info?.isTrial ? '#F59E0B' : isPaidActive ? '#22C55E' : '#EF4444';
  const statusTitle = info?.isTrial
    ? 'Free trial'
    : isPaidActive
      ? info.status === 'grace_period' ? 'Payment grace period' : 'Subscription active'
      : info?.status === 'pending' ? 'Subscription not started' : 'Subscription expired';
  const expiryLabel = info?.expiresAt
    ? new Date(info.expiresAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Not available';
  const timeRemaining = info
    ? info.hoursLeft < 24
      ? `${Math.max(info.hoursLeft, 1)} hour${info.hoursLeft === 1 ? '' : 's'} remaining`
      : `${info.daysLeft} day${info.daysLeft === 1 ? '' : 's'} remaining`
    : '';
  const canSubscribe = !!info && (info.isTrial || !isPaidActive);

  return (
    <ThemedView style={styles.root}>
      <StatusBar style={C.isDark ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSubscription(true)} tintColor="#FACC15" />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton}>
            <Ionicons name="arrow-back" size={21} color={C.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <ThemedText style={styles.eyebrow}>ACCOUNT & BILLING</ThemedText>
            <ThemedText style={styles.title}>Subscription</ThemedText>
          </View>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#FACC15" />
            <ThemedText style={styles.loadingText}>Loading subscription details...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.card}>
            <Ionicons name="cloud-offline-outline" size={34} color="#EF4444" />
            <ThemedText style={styles.cardTitle}>Unable to load status</ThemedText>
            <ThemedText style={styles.body}>{error}</ThemedText>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => loadSubscription()}>
              <ThemedText style={styles.secondaryButtonText}>Try again</ThemedText>
            </TouchableOpacity>
          </View>
        ) : info ? (
          <>
            <View style={[styles.statusCard, { borderColor: `${statusColor}70` }]}>
              <View style={[styles.statusIcon, { backgroundColor: `${statusColor}20` }]}>
                <Ionicons name={info.isTrial ? 'time-outline' : isPaidActive ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={30} color={statusColor} />
              </View>
              <ThemedText style={[styles.statusTitle, { color: statusColor }]}>{statusTitle}</ThemedText>
              <ThemedText style={styles.body}>
                {info.isTrial
                  ? `Your school currently has full access on a free trial. ${timeRemaining}.`
                  : isPaidActive
                    ? 'Your school subscription is active and premium features are available.'
                    : info.status === 'pending'
                      ? 'Choose a plan to activate your school subscription and access premium features.'
                      : 'Your school subscription has ended. Renew to restore access to premium features.'}
              </ThemedText>
            </View>

            <View style={styles.card}>
              <ThemedText style={styles.sectionTitle}>PLAN DETAILS</ThemedText>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}><Ionicons name="calendar-outline" size={18} color="#FACC15" /></View>
                <View style={styles.detailText}>
                  <ThemedText style={styles.detailLabel}>{info.isTrial ? 'Trial ends' : 'Access expires'}</ThemedText>
                  <ThemedText style={styles.detailValue}>{expiryLabel}</ThemedText>
                </View>
              </View>
              {info.isTrial && (
                <View style={[styles.detailRow, styles.lastDetailRow]}>
                  <View style={styles.detailIcon}><Ionicons name="hourglass-outline" size={18} color="#FACC15" /></View>
                  <View style={styles.detailText}>
                    <ThemedText style={styles.detailLabel}>Time left</ThemedText>
                    <ThemedText style={styles.detailValue}>{timeRemaining}</ThemedText>
                  </View>
                </View>
              )}
              {isPaidActive && (
                <View style={[styles.detailRow, styles.lastDetailRow]}>
                  <View style={styles.detailIcon}><Ionicons name="shield-checkmark-outline" size={18} color="#22C55E" /></View>
                  <View style={styles.detailText}>
                    <ThemedText style={styles.detailLabel}>Plan status</ThemedText>
                    <ThemedText style={styles.detailValue}>Active</ThemedText>
                  </View>
                </View>
              )}
            </View>

            {canSubscribe ? (
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/pricing' as any)} activeOpacity={0.85}>
                <ThemedText style={styles.primaryButtonText}>{info.isTrial ? 'SUBSCRIBE NOW' : info.status === 'pending' ? 'CHOOSE A PLAN' : 'RENEW NOW'}</ThemedText>
                <Ionicons name="arrow-forward" size={18} color="#111827" />
              </TouchableOpacity>
            ) : (
              <View style={styles.notice}>
                <Ionicons name="information-circle-outline" size={19} color={C.textSecondary} />
                <ThemedText style={styles.noticeText}>You can renew after your current paid plan expires.</ThemedText>
              </View>
            )}
          </>
        ) : null}

        <ThemedText style={styles.footerText}>Need help with billing? Contact Sabino support.</ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function makeStyles(C: ReturnType<typeof useAppColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: C.background },
    content: { flexGrow: 1, width: '100%', maxWidth: 680, alignSelf: 'center', padding: 22, paddingTop: 32, paddingBottom: 40 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 26, gap: 14 },
    backButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder },
    headerText: { flex: 1 },
    eyebrow: { color: C.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
    title: { color: C.text, fontSize: 27, fontWeight: '900', marginTop: 3 },
    loading: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 14 },
    loadingText: { color: C.textSecondary, fontSize: 14 },
    card: { padding: 22, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 16, alignItems: 'flex-start' },
    statusCard: { padding: 24, borderRadius: 24, backgroundColor: C.card, borderWidth: 1.5, alignItems: 'center', marginBottom: 16 },
    statusIcon: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    statusTitle: { fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
    body: { color: C.textSecondary, fontSize: 14, lineHeight: 21, textAlign: 'center' },
    cardTitle: { color: C.text, fontSize: 18, fontWeight: '800', marginTop: 12, marginBottom: 8 },
    sectionTitle: { color: C.textMuted, fontSize: 11, letterSpacing: 1.2, fontWeight: '900', marginBottom: 10 },
    detailRow: { width: '100%', flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.divider },
    lastDetailRow: { borderBottomWidth: 0, paddingBottom: 2 },
    detailIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.actionIconWrap, marginRight: 13 },
    detailText: { flex: 1 },
    detailLabel: { color: C.textMuted, fontSize: 12, marginBottom: 3 },
    detailValue: { color: C.text, fontSize: 15, fontWeight: '700' },
    primaryButton: { minHeight: 56, borderRadius: 17, backgroundColor: '#FACC15', paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 2 },
    primaryButtonText: { color: '#111827', fontWeight: '900', fontSize: 14, letterSpacing: 0.6 },
    secondaryButton: { alignSelf: 'stretch', minHeight: 48, borderRadius: 14, backgroundColor: '#FACC15', alignItems: 'center', justifyContent: 'center', marginTop: 18 },
    secondaryButtonText: { color: '#111827', fontWeight: '900' },
    notice: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 14, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder },
    noticeText: { flex: 1, color: C.textSecondary, fontSize: 13, lineHeight: 19 },
    footerText: { color: C.textMuted, textAlign: 'center', fontSize: 12, marginTop: 18 },
  });
}