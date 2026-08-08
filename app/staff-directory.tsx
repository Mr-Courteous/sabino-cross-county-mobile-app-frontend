import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';
import { isSchoolOwner } from '@/utils/jwt-decoder';
import { Colors } from '@/constants/design-system';
import { CustomAlert } from '@/components/custom-alert';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAppColors } from '@/hooks/use-app-colors';

interface Admin {
  id: number;
  full_name: string;
  email: string;
  phone?: string;
  role?: string;
  status: string; // 'active' | 'password_reset_required' | 'invited' | ...
  created_at: string;
}

interface PendingInvite {
  id: number;
  code: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  status: string;
  expires_at: string;
  created_at: string;
}

export default function StaffDirectoryPage() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const C = useAppColors();
  const styles = useMemo(() => makeStyles(C, width), [C.scheme, width]);

  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isOwner, setIsOwner] = useState(true);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [alert, setAlert] = useState<{ visible: boolean; type: 'success' | 'error' | 'info'; message: string }>({
    visible: false,
    type: 'info',
    message: '',
  });

  const getToken = async () => {
    return Platform.OS !== 'web' ? await SecureStore.getItemAsync('userToken') : localStorage.getItem('userToken');
  };

  const fetchStaff = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace('/(auth)');
        return;
      }

      setIsOwner(isSchoolOwner(token));

      const res = await fetch(`${API_BASE_URL}/api/staff/admins`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 402) { router.replace('/pricing'); return; }
      if (res.status === 401) { router.replace('/(auth)'); return; }

      const result = await res.json();
      if (result.success) {
        setAdmins(result.data?.admins || []);
        setPendingInvites(result.data?.pendingInvites || []);
      } else {
        setAlert({ visible: true, type: 'error', message: result.error || 'Failed to load staff.' });
      }
    } catch (e) {
      setAlert({ visible: true, type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setHasLoadedOnce(true);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      // Full-screen loader only on the very first load; refocusing after
      // Add Staff refreshes quietly in the background instead.
      if (hasLoadedOnce) {
        fetchStaff();
      } else {
        setLoading(true);
        fetchStaff();
      }
    }, [fetchStaff, hasLoadedOnce])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchStaff();
  };

  const handleAddStaff = () => {
    router.push('/add-staff');
  };

  const isTiny = width < 300;

  if (loading) {
    return (
      <ThemedView style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.accent.gold} />
        <ThemedText style={styles.loadingText}>Loading Staff...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <StatusBar style={C.isDark ? 'light' : 'dark'} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={isTiny ? 18 : 22} color={C.text} />
        </TouchableOpacity>
        <ThemedText style={styles.headerTitle}>Staff Directory</ThemedText>
        {isOwner ? (
          <TouchableOpacity onPress={handleAddStaff} style={styles.addBtn}>
            <Ionicons name="add" size={isTiny ? 20 : 24} color="#0F172A" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent.gold} />}
      >
        {!isOwner && (
          <View style={styles.noticeBanner}>
            <Ionicons name="information-circle-outline" size={16} color={C.textMuted} />
            <ThemedText style={styles.noticeText}>Only the school owner can add, remove, or manage staff accounts.</ThemedText>
          </View>
        )}

        <ThemedText style={styles.sectionLabel}>ACTIVE ADMINS ({admins.length})</ThemedText>
        {admins.length === 0 ? (
          <View style={styles.emptyCard}>
            <ThemedText style={styles.emptyText}>No admin accounts yet.</ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {admins.map((a) => (
              <View key={a.id} style={styles.staffCard}>
                <View style={styles.staffIconWrap}>
                  <Ionicons name="person-outline" size={18} color={Colors.accent.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.staffName} numberOfLines={1}>{a.full_name}</ThemedText>
                  <ThemedText style={styles.staffSub} numberOfLines={1}>{a.email}</ThemedText>
                </View>
                <StatusBadge status={a.status} />
              </View>
            ))}
          </View>
        )}

        <ThemedText style={[styles.sectionLabel, { marginTop: 24 }]}>PENDING INVITES ({pendingInvites.length})</ThemedText>
        {pendingInvites.length === 0 ? (
          <View style={styles.emptyCard}>
            <ThemedText style={styles.emptyText}>No pending invites.</ThemedText>
          </View>
        ) : (
          <View style={styles.list}>
            {pendingInvites.map((inv) => (
              <View key={inv.id} style={styles.staffCard}>
                <View style={[styles.staffIconWrap, { backgroundColor: '#F59E0B15' }]}>
                  <Ionicons name="mail-outline" size={18} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.staffName} numberOfLines={1}>{inv.full_name || inv.email || 'Unnamed invite'}</ThemedText>
                  <ThemedText style={styles.staffSub} numberOfLines={1}>Code: {inv.code}</ThemedText>
                </View>
                <StatusBadge status="pending" />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {alert.visible && (
        <CustomAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert({ ...alert, visible: false })}
        />
      )}
    </ThemedView>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = (status || '').toLowerCase();
  const isActive = normalized === 'active';
  const isPending = normalized === 'pending' || normalized === 'invited' || normalized === 'password_reset_required';

  const label = isActive ? 'Active' : isPending ? 'Pending' : status;
  const color = isActive ? '#22C55E' : isPending ? '#F59E0B' : '#94A3B8';

  return (
    <View style={[badgeStyles.badge, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
      <View style={[badgeStyles.dot, { backgroundColor: color }]} />
      <ThemedText style={[badgeStyles.text, { color }]}>{label}</ThemedText>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 10, fontWeight: '800' },
});

function makeStyles(C: ReturnType<typeof import('@/hooks/use-app-colors').useAppColors>, width: number) {
  const isTiny = width < 300;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.background },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.background },
    loadingText: { color: Colors.accent.gold, marginTop: 15, fontWeight: '800', fontSize: 10, letterSpacing: 2 },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingHorizontal: isTiny ? 15 : 20, paddingBottom: 16, backgroundColor: C.modalBg, borderBottomWidth: 1, borderColor: C.divider },
    backBtn: { width: isTiny ? 36 : 40, height: isTiny ? 36 : 40, borderRadius: 12, backgroundColor: C.actionItemBg, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: C.text, fontSize: isTiny ? 14 : 16, fontWeight: '800' },
    addBtn: { width: isTiny ? 36 : 40, height: isTiny ? 36 : 40, borderRadius: 12, backgroundColor: Colors.accent.gold, justifyContent: 'center', alignItems: 'center' },

    scrollContent: { padding: isTiny ? 16 : 22, paddingBottom: 60 },

    noticeBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.actionItemBg, borderRadius: 14, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: C.actionItemBorder },
    noticeText: { flex: 1, color: C.textMuted, fontSize: 11, lineHeight: 15 },

    sectionLabel: { color: C.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },

    emptyCard: { backgroundColor: C.actionItemBg, borderRadius: 16, borderWidth: 1, borderColor: C.actionItemBorder, padding: 18, alignItems: 'center' },
    emptyText: { color: C.textMuted, fontSize: 12, fontWeight: '600' },

    list: { gap: 10 },
    staffCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.actionItemBg, borderRadius: 16, borderWidth: 1, borderColor: C.actionItemBorder, padding: 12 },
    staffIconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: `${Colors.accent.gold}15`, justifyContent: 'center', alignItems: 'center' },
    staffName: { color: C.text, fontSize: 13, fontWeight: '800' },
    staffSub: { color: C.textMuted, fontSize: 10, fontWeight: '600', marginTop: 2 },
  });
}
