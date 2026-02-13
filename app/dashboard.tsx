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
  SafeAreaView
} from 'react-native';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/utils/api-service';
import { clearAllStorage } from '@/utils/storage';
import { useTheme } from '@/contexts/theme-context';

const { width } = Dimensions.get('window');

export default function DashboardPage() {
  const router = useRouter();
  const { themeColor, loadThemeFromPreferences } = useTheme();
  const [schoolData, setSchoolData] = useState<any>(null);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = Platform.OS !== 'web'
          ? await SecureStore.getItemAsync('userToken')
          : localStorage.getItem('userToken');

        if (!token) {
          router.replace('/(auth)');
          return;
        }

        // Load theme color from preferences
        await loadThemeFromPreferences();

        // Fetch school profile
        const schoolResponse = await fetch(`${API_BASE_URL}/api/schools/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const schoolResult = await schoolResponse.json();
        if (schoolResult.success) {
          setSchoolData(schoolResult.data);
        }

        // Fetch active academic session
        const sessionResponse = await fetch(`${API_BASE_URL}/api/academic-sessions`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const sessionResult = await sessionResponse.json();
        if (sessionResult.success && sessionResult.data.length > 0) {
          // Find active session
          const activeSession = sessionResult.data.find((s: any) => s.is_active);
          if (activeSession) {
            setActiveSessionId(activeSession.id);
            // Store sessionId locally for use by other screens
            if (Platform.OS !== 'web') {
              await SecureStore.setItemAsync('activeSessionId', String(activeSession.id));
            } else {
              localStorage.setItem('activeSessionId', String(activeSession.id));
            }
          }
        }
      } catch (e) {
        console.error("Dashboard Load Error:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const handleLogout = async () => {
    await clearAllStorage();
    router.replace('/');
  };

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator size="large" color="#FACC15" />
    </View>
  );

  return (
    <SafeAreaView style={styles.mainWrapper}>
      <StatusBar style="light" />

      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.topHeader}>
        <View style={styles.headerContent}>
          <View style={styles.logoAndName}>
            <View style={styles.logoContainer}>
              {schoolData?.logo ? (
                <Image source={{ uri: schoolData.logo }} style={styles.schoolLogo} />
              ) : (
                <View style={[styles.logoPlaceholder, { backgroundColor: themeColor + '20' }]}>
                  <Ionicons name="school" size={24} color={themeColor} />
                </View>
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.schoolTypeBadge}>
                {schoolData?.school_type?.toUpperCase() || 'INSTITUTION'}
              </Text>
              <Text style={styles.schoolName} numberOfLines={1}>
                {schoolData?.name?.toUpperCase() || 'SABINO ACADEMY'}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={handleLogout} style={styles.logoutIcon}>
            <Ionicons name="power" size={20} color="#FACC15" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoBar}>
          <View style={styles.infoItem}>
            <Ionicons name="mail" size={12} color="#FACC15" />
            <Text style={styles.infoText} numberOfLines={1}>{schoolData?.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="location" size={12} color="#FACC15" />
              <Text style={styles.infoText} numberOfLines={1}>
                {schoolData?.address || 'Location not set'}
              </Text>
            </View>
            <View style={[styles.infoItem, { marginLeft: 10 }]}>
              <Ionicons name="key" size={12} color="#FACC15" />
              <Text style={styles.infoText}>{schoolData?.registration_code}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>

        <View style={styles.sectionHeader}>
          <View style={[styles.goldIndicator, { backgroundColor: themeColor }]} />
          <Text style={styles.sectionTitle}>ACADEMIC COMMAND</Text>
        </View>

        <View style={styles.mainActionGrid}>
          <MainActionCard
            title="Register"
            icon="person-add"
            color="#2563EB"
            onPress={() => router.push('/students_list')}
          />
          <MainActionCard
            title="Scores"
            icon="document-text"
            color={themeColor}
            onPress={() => router.push('/score-entry')}
          />
        </View>

        <View style={styles.mainActionGrid}>
          <MainActionCard
            title="Results"
            icon="document"
            color="#059669"
            onPress={() => router.push('/report-cards')}
          />
          <MainActionCard
            title="View Results"
            icon="eye"
            color={themeColor}
            onPress={() => router.push({
              pathname: '/report-view',
              params: { mode: 'class' }
            })}
          />
        </View>

        <View style={[styles.sectionHeader, { marginTop: 10 }]}>
          <View style={[styles.goldIndicator, { backgroundColor: themeColor }]} />
          <Text style={styles.sectionTitle}>SYSTEM UTILITIES</Text>
        </View>

        <View style={styles.utilityGrid}>
          <SmallCard title="List" icon="list" onPress={() => router.push('/students_list')} themeColor={themeColor} />
          <SmallCard
            title="Branding"
            icon="color-palette"
            onPress={() => router.push('/preferences')}
            themeColor={themeColor}
            highlight
          />
          <SmallCard title="Settings" icon="settings" onPress={() => { }} themeColor={themeColor} />
          <SmallCard title="Support" icon="chatbubbles" onPress={() => { }} themeColor={themeColor} />
          <SmallCard title="Analytics" icon="stats-chart" onPress={() => { }} themeColor={themeColor} />
          <SmallCard title="Payments" icon="card" onPress={() => router.push('/(payments)/initiate')} themeColor={themeColor} />
          <SmallCard title="Reset Pwd" icon="lock-closed" onPress={() => router.push('/(auth)/forgot-password')} themeColor={themeColor} />
          <SmallCard title="Add-ons" icon="add-circle" isPlaceholder themeColor={themeColor} />
        </View>

        <TouchableOpacity style={styles.footerLogout} onPress={handleLogout}>
          <Text style={styles.footerLogoutText}>TERMINATE SECURE SESSION</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function MainActionCard({ title, icon, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.mainCard} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient colors={[color, color + 'CC']} style={styles.mainCardGradient}>
        <Ionicons name={icon} size={28} color="#fff" />
        <Text style={styles.mainCardTitle}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function SmallCard({ title, icon, onPress, isPlaceholder, themeColor, highlight }: any) {
  return (
    <TouchableOpacity
      style={[
        styles.smallCard,
        isPlaceholder && styles.placeholderCard,
        highlight && { borderColor: themeColor, borderWidth: 2, backgroundColor: themeColor + '08' }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={isPlaceholder}
    >
      <View style={[
        styles.smallIconCircle,
        isPlaceholder && { backgroundColor: '#F1F5F9' },
        highlight && { backgroundColor: themeColor + '20', borderColor: themeColor, borderWidth: 1.5 }
      ]}>
        <Ionicons
          name={icon}
          size={20}
          color={isPlaceholder ? "#94A3B8" : (highlight ? themeColor : "#1E293B")}
        />
      </View>
      <Text style={[
        styles.smallCardTitle,
        highlight && { color: themeColor, fontWeight: '900' }
      ]} numberOfLines={1}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: '#F8FAFC' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },

  topHeader: {
    paddingTop: Platform.OS === 'android' ? 45 : 10,
    paddingHorizontal: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  logoAndName: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  logoContainer: { elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5 },
  schoolLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#fff' },
  logoPlaceholder: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center'
  },
  schoolTypeBadge: {
    color: '#FACC15', fontSize: 10, fontWeight: '900', letterSpacing: 1,
    backgroundColor: 'rgba(250, 204, 21, 0.1)', alignSelf: 'flex-start',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4
  },
  schoolName: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 2 },
  logoutIcon: { padding: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10 },

  infoBar: { gap: 6, marginTop: 5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoItem: { flexDirection: 'row', alignItems: 'center', opacity: 0.8 },
  infoText: { color: '#CBD5E1', fontSize: 11, fontWeight: '600', marginLeft: 6 },

  scrollContainer: { paddingHorizontal: 20, paddingBottom: 30 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, marginTop: 25 },
  goldIndicator: { width: 4, height: 16, backgroundColor: '#FACC15', borderRadius: 2, marginRight: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '900', color: '#64748B', letterSpacing: 1 },

  mainActionGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  mainCard: { width: '48%', borderRadius: 20, overflow: 'hidden', elevation: 4, marginBottom: 15 },
  mainCardGradient: { paddingVertical: 24, alignItems: 'center' },
  mainCardTitle: { color: '#fff', fontWeight: '900', marginTop: 10, fontSize: 15 },

  utilityGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  smallCard: {
    width: '31%',
    backgroundColor: '#fff',
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  placeholderCard: { borderStyle: 'dashed', borderColor: '#CBD5E1', backgroundColor: 'transparent' },
  smallIconCircle: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 8
  },
  smallCardTitle: { fontSize: 12, fontWeight: '800', color: '#1E293B', textAlign: 'center' },

  footerLogout: {
    marginTop: 20, padding: 18, borderRadius: 15, borderStyle: 'dashed',
    borderWidth: 1, borderColor: '#FEE2E2', alignItems: 'center'
  },
  footerLogoutText: { color: '#EF4444', fontSize: 12, fontWeight: '900', letterSpacing: 1 }
});