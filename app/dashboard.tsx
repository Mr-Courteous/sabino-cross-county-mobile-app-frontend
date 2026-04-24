import { useRouter } from 'expo-router';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';
import { clearAllStorage } from '@/utils/storage';
import { useTheme } from '@/contexts/theme-context';
import { Colors } from '@/constants/design-system';
import { ThemedView } from '@/components/themed-view';
import { CustomButton } from '@/components/custom-button';
import { CustomAlert } from '@/components/custom-alert';
import Footer from './components/Footer';

const { width } = Dimensions.get('window');

export default function DashboardPage() {
  const router = useRouter();
  const { themeColor, loadThemeFromPreferences } = useTheme();
  const [schoolData, setSchoolData] = useState<any>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const fetchDashboardData = useCallback(async () => {
    try {
      const token = Platform.OS !== 'web'
        ? await SecureStore.getItemAsync('userToken')
        : localStorage.getItem('userToken');

      if (!token) {
        router.replace('/(auth)');
        return;
      }

      await loadThemeFromPreferences();

      // Parallel fetch for better performance
      const [schoolRes, sessionRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/schools/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/academic-sessions`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      const schoolResult = await schoolRes.json();
      if (schoolResult.success) setSchoolData(schoolResult.data);

      const sessionResult = await sessionRes.json();
      if (sessionResult.success && sessionResult.data.length > 0) {
        const activeSession = sessionResult.data.find((s: any) => s.is_active);
        if (activeSession) {
          setActiveSessionId(activeSession.id);
          const sid = String(activeSession.id);
          Platform.OS !== 'web' 
            ? await SecureStore.setItemAsync('activeSessionId', sid)
            : localStorage.setItem('activeSessionId', sid);
        }
      }
    } catch (e: any) {
      setStatusAlert({
        visible: true,
        type: 'error',
        title: 'System Error',
        message: 'Unable to synchronize dashboard data.'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadThemeFromPreferences, router]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleLogout = async () => {
    setStatusAlert({
      visible: true,
      type: 'warning',
      title: 'Portal Sign-out',
      message: 'Are you sure you want to terminate your current administrative session?',
      onConfirm: async () => {
        await clearAllStorage();
        router.replace('/');
      }
    });
  };

  if (loading) return (
    <ThemedView style={styles.loader}>
      <ActivityIndicator size="large" color={Colors.accent.gold} />
      <Text style={styles.loadingText}>INITIALIZING PORTAL...</Text>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.mainWrapper}>
      <StatusBar style="light" />

      <View style={styles.hero}>
        <LinearGradient
          colors={['#1E293B', '#0F172A', Colors.accent.navy]}
          style={styles.heroOverlay}
        >
          <View style={[styles.header, { zIndex: 50 }]}>
            <View style={styles.logoContainer}>
              {schoolData?.logo ? (
                <Image source={{ uri: schoolData.logo }} style={styles.schoolLogo} />
              ) : (
                <View style={[styles.logoPlaceholder, { backgroundColor: themeColor + '20' }]}>
                  <Ionicons name="school" size={28} color={themeColor} />
                </View>
              )}
            </View>
            <TouchableOpacity onPress={handleLogout} style={[styles.powerBtn, { zIndex: 50 }]}>
              <Ionicons name="power" size={20} color={Colors.accent.gold} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.schoolType}>{schoolData?.school_type?.toUpperCase() || 'REGISTERED INSTITUTION'}</Text>
            <Text style={styles.schoolName}>{schoolData?.name?.toUpperCase() || 'SABINO ACADEMY'}</Text>
            <View style={styles.schoolMetaRow}>
              <View style={styles.metaBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#94A3B8" />
                <Text style={styles.schoolReg}>REG: {schoolData?.registration_code || 'PENDING'}</Text>
              </View>
              {schoolData?.email && (
                <View style={styles.metaBadge}>
                  <Ionicons name="mail" size={12} color="#94A3B8" />
                  <Text style={styles.schoolReg}>{schoolData.email}</Text>
                </View>
              )}
              {schoolData?.phone && (
                <View style={styles.metaBadge}>
                  <Ionicons name="call" size={12} color="#94A3B8" />
                  <Text style={styles.schoolReg}>{schoolData.phone}</Text>
                </View>
              )}
              {(schoolData?.city || schoolData?.country) && (
                <View style={styles.metaBadge}>
                  <Ionicons name="location" size={12} color={Colors.accent.gold} />
                  <Text style={[styles.schoolReg, { color: Colors.accent.gold }]}>
                    {[schoolData.city, schoolData.state, schoolData.country].filter(Boolean).join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent.gold} />}
      >
        <View style={styles.card}>
          <Text style={styles.cardLabel}>OPERATIONS CENTER</Text>
          <View style={styles.actionList}>
            <ActionListItem 
              title="Student Management" 
              icon="people-outline" 
              onPress={() => router.push('/students_list')} 
              highlight 
              themeColor={Colors.primary.main} 
            />
            <ActionListItem 
              title="Score & Assessments Entry" 
              icon="document-text-outline" 
              onPress={() => router.push('/score-entry')} 
            />
            <ActionListItem 
              title="Batch Report Generation" 
              icon="copy-outline" 
              onPress={() => router.push('/report-cards')} 
            />
            <ActionListItem 
              title="Institution Profile" 
              icon="business-outline" 
              onPress={() => router.push('/school-profile')} 
            />
            <ActionListItem 
              title="School Branding Preferences" 
              icon="color-palette-outline" 
              onPress={() => router.push('/preferences')} 
              highlight 
              themeColor={themeColor} 
            />
            <ActionListItem 
              title="Institution Finance" 
              icon="card-outline" 
              onPress={() => router.push('/(payments)/initiate')} 
            />
          </View>
        </View>

        <View style={{ flex: 1 }} />
        <Footer themeColor={themeColor} schoolName={schoolData?.name} onLogout={handleLogout} />
      </ScrollView>

      {/* App-level Status Alert Modal */}
      <Modal visible={statusAlert.visible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <CustomAlert 
            type={statusAlert.type} 
            title={statusAlert.title} 
            message={statusAlert.message} 
            onClose={() => setStatusAlert({ ...statusAlert, visible: false })}
            onConfirm={statusAlert.onConfirm}
            style={{ width: '100%' }}
          />
        </View>
      </Modal>
    </ThemedView>
  );
}


function ActionListItem({ title, icon, onPress, themeColor, highlight }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.actionListItem,
        highlight && { borderColor: themeColor + '40', backgroundColor: themeColor + '08' }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.actionListLeft}>
        <View style={[
          styles.actionListIconWrap,
          highlight && { backgroundColor: themeColor + '15' }
        ]}>
          <Ionicons
            name={icon}
            size={22}
            color={highlight ? themeColor : Colors.accent.gold}
          />
        </View>
        <Text 
          style={[
            styles.actionListTitle,
            highlight && { color: '#FFFFFF', fontWeight: '800' }
          ]}
          numberOfLines={2}  
        >
          {title}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#64748B" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#0A0F1E' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0F1E' },
  loadingText: { color: Colors.accent.gold, marginTop: 15, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  
  hero: { height: 360, width: '100%', zIndex: 1 },
  heroOverlay: { flex: 1, paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 70 : 50, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  logoContainer: { width: 65, height: 65, borderRadius: 18, backgroundColor: '#FFFFFF', padding: 3, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  schoolLogo: { width: '100%', height: '100%', borderRadius: 15 },
  logoPlaceholder: { width: '100%', height: '100%', borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  powerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(239, 68, 68, 0.15)', justifyContent: 'center', alignItems: 'center', elevation: 5 },

  heroContent: { marginTop: 'auto', marginBottom: 80 },
  schoolType: { color: Colors.accent.gold, fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  schoolName: { color: '#FFFFFF', fontSize: 32, fontWeight: '900', letterSpacing: -0.5, marginBottom: 12 },
  
  schoolMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
  schoolReg: { color: '#E2E8F0', fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  scrollView: { flex: 1, marginTop: -45, zIndex: 10, elevation: 10 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 60, flexGrow: 1 },
  
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },

  card: { backgroundColor: 'rgba(30, 41, 59, 0.7)', borderRadius: 32, padding: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', marginBottom: 24 },
  cardLabel: { color: '#64748B', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 30, marginLeft: 4 },

  actionList: { gap: 12 },
  actionListItem: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(15, 23, 42, 0.6)', paddingRight: 20, paddingVertical: 12, paddingLeft: 12, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  actionListLeft: { flexDirection: 'row', alignItems: 'center', gap: 16, flex: 1, paddingRight: 10 },
  actionListIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.05)', justifyContent: 'center', alignItems: 'center' },
  actionListTitle: { color: '#E2E8F0', fontSize: 13, fontWeight: '700', letterSpacing: 0.5, flexShrink: 1 },
});