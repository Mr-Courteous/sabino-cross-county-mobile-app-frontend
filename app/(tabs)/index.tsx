import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, SafeAreaView, Platform, Alert
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { clearAllStorage } from '@/utils/storage';

const { width } = Dimensions.get('window');

export default function SchoolAdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const ok = window.confirm('Are you sure you want to logout?');
      if (ok) {
        await clearAllStorage();
        router.replace('/');
      }
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            await clearAllStorage();
            router.replace('/');
          },
          style: 'destructive'
        }
      ]
    );
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        let userData = null;

        if (Platform.OS !== 'web') {
          try {
            const stored = await SecureStore.getItemAsync('userData');
            userData = stored ? JSON.parse(stored) : null;
          } catch (e) {
            userData = localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')!) : null;
          }
        } else {
          userData = localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')!) : null;
        }

        setUser(userData);
      } catch (err) {
        console.error('Failed to load user:', err);
      }
    };

    loadUser();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* HEADER */}
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.brandName}>SABINO<Text style={{ color: '#2563EB' }}>SCHOOL</Text></Text>
              <Text style={styles.schoolName}>{user?.firstName?.toUpperCase() || "SCHOOL"} ADMINISTRATION</Text>
            </View>
            <TouchableOpacity style={styles.profileBtn} onPress={handleLogout}>
              <Ionicons name="power" size={18} color="#FACC15" />
              <Text style={styles.profileLogoutText}>Logout</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.idBadge}>
            <Text style={styles.idText}>SCHOOL ID: {user?.schoolId || '---'}</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* ACADEMIC OPERATIONS */}
        <Text style={styles.sectionLabel}>ACADEMIC OPERATIONS</Text>
        <View style={styles.grid}>

          <ActionCard
            title="Register Students"
            desc="Add & Manage Enrollments"
            icon="person-add"
            color="#2563EB"
            onPress={() => router.push('/students_list')}
          />

          <ActionCard
            title="Record Scores"
            desc="Input Exam & Test Marks"
            icon="stats-chart"
            color="#FACC15"
            darkText
            onPress={() => router.push('/score-entry')}
          />

        </View>

        {/* CUSTOMIZATION */}
        <Text style={styles.sectionLabel}>REPORT CARD DESIGN</Text>
        <TouchableOpacity style={styles.settingsCard} activeOpacity={0.7}>
          <View style={styles.settingsInner}>
            <View style={styles.settingsIcon}>
              <Ionicons name="color-wand" size={26} color="#0F172A" />
            </View>
            <View style={styles.settingsContent}>
              <Text style={styles.settingsTitle}>Customize Reports</Text>
              <Text style={styles.settingsSub}>Logos, Digital Stamps & Themes</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </View>
        </TouchableOpacity>

      </ScrollView>
    </View >
  );
}

/* --- REUSABLE COMPONENT DEFINITION --- */

interface ActionCardProps {
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
  darkText?: boolean;
}

function ActionCard({ title, desc, icon, color, onPress, darkText = false }: ActionCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon as any} size={32} color={darkText ? '#0F172A' : '#fff'} />
      <Text style={[styles.cardTitle, { color: darkText ? '#0F172A' : '#fff' }]}>{title}</Text>
      <Text style={[styles.cardDesc, { color: darkText ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255,255,255,0.7)' }]}>{desc}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 25, paddingBottom: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Platform.OS === 'android' ? 40 : 10 },
  brandName: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  schoolName: { color: '#94A3B8', fontSize: 11, fontWeight: '800', marginTop: 4 },
  profileBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
  profileLogoutText: { color: '#FACC15', marginLeft: 8, fontWeight: '900' },
  idBadge: { backgroundColor: 'rgba(0,0,0,0.3)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 20 },
  idText: { color: '#FACC15', fontSize: 10, fontWeight: '900' },

  body: { flex: 1, padding: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '900', color: '#64748B', letterSpacing: 1.5, marginBottom: 15, marginTop: 10 },

  grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  card: { width: (width - 55) / 2, padding: 22, borderRadius: 30, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  cardTitle: { fontSize: 16, fontWeight: '900', marginTop: 15 },
  cardDesc: { fontSize: 10, fontWeight: '600', marginTop: 5 },

  settingsCard: { backgroundColor: '#fff', borderRadius: 25, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
  settingsInner: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  settingsIcon: { width: 55, height: 55, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  settingsContent: { flex: 1, marginLeft: 15 },
  settingsTitle: { fontSize: 16, fontWeight: '900', color: '#0F172A' },
  settingsSub: { fontSize: 12, color: '#64748B', marginTop: 2 }
});