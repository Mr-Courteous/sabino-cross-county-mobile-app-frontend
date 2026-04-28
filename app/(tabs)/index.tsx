import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Platform, Alert, useWindowDimensions
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { clearAllStorage } from '@/utils/storage';

export default function SchoolAdminDashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
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
        { text: 'Cancel', onPress: () => { }, style: 'cancel' },
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

  const loadUser = useCallback(async () => {
    try {
      let userData = null;

      if (Platform.OS !== 'web') {
        try {
          const stored = await SecureStore.getItemAsync('userData');
          userData = stored ? JSON.parse(stored) : null;
        } catch (e) {
          const stored = localStorage.getItem('userData');
          userData = stored ? JSON.parse(stored) : null;
        }
      } else {
        const stored = localStorage.getItem('userData');
        userData = stored ? JSON.parse(stored) : null;
      }

      setUser(userData);
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser])
  );

  const styles = makeStyles(width);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* HEADER */}
      <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.header}>
        <SafeAreaView>
          <View style={styles.headerContent}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brandName}>SABINO EDU</Text>
              <Text style={styles.schoolName} numberOfLines={1}>
                {user?.firstName?.toUpperCase() || "SCHOOL"} ADMINISTRATION
              </Text>
            </View>
            <TouchableOpacity style={styles.profileBtn} onPress={handleLogout}>
              <Ionicons name="power" size={width < 300 ? 14 : 16} color="#FACC15" />
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
            width={width}
          />

          <ActionCard
            title="Record Scores"
            desc="Input Exam & Test Marks"
            icon="stats-chart"
            color="#FACC15"
            darkText
            onPress={() => router.push('/score-entry')}
            width={width}
          />
        </View>

        {/* CUSTOMIZATION */}
        <Text style={styles.sectionLabel}>REPORT CARD DESIGN</Text>
        <TouchableOpacity style={styles.settingsCard} activeOpacity={0.7} onPress={() => router.push('/school-profile')}>
          <View style={styles.settingsInner}>
            <View style={styles.settingsIcon}>
              <Ionicons name="color-wand" size={width < 300 ? 20 : 24} color="#0F172A" />
            </View>
            <View style={styles.settingsContent}>
              <Text style={styles.settingsTitle}>Customize Reports</Text>
              <Text style={styles.settingsSub}>Logos, Digital Stamps & Themes</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
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
  width: number;
}

function ActionCard({ title, desc, icon, color, onPress, darkText = false, width }: ActionCardProps) {
  const isTiny = width < 320;
  const cardWidth = isTiny ? '100%' : (width - 55) / 2;

  return (
    <TouchableOpacity
      style={[
        {
          width: cardWidth as any,
          padding: isTiny ? 18 : 20,
          borderRadius: 25,
          backgroundColor: color,
          marginBottom: isTiny ? 12 : 0,
          elevation: 4,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 8,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name={icon as any} size={isTiny ? 24 : 28} color={darkText ? '#0F172A' : '#fff'} />
      <Text style={{
        fontSize: isTiny ? 13 : 14,
        fontWeight: '900',
        marginTop: 12,
        color: darkText ? '#0F172A' : '#fff'
      }}>{title}</Text>
      <Text style={{
        fontSize: isTiny ? 8 : 9,
        fontWeight: '600',
        marginTop: 4,
        color: darkText ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255,255,255,0.7)'
      }}>{desc}</Text>
    </TouchableOpacity>
  );
}

const makeStyles = (width: number) => {
  const isTiny = width < 300;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { paddingHorizontal: isTiny ? 15 : 25, paddingBottom: isTiny ? 30 : 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Platform.OS === 'android' ? 40 : 10 },
    brandName: { color: '#fff', fontSize: isTiny ? 18 : 20, fontWeight: '900', letterSpacing: 1 },
    schoolName: { color: '#94A3B8', fontSize: 9, fontWeight: '800', marginTop: 4 },
    profileBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
    profileLogoutText: { color: '#FACC15', marginLeft: 6, fontWeight: '900', fontSize: isTiny ? 10 : 11 },
    idBadge: { backgroundColor: 'rgba(0,0,0,0.3)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginTop: isTiny ? 15 : 20 },
    idText: { color: '#FACC15', fontSize: 8, fontWeight: '900' },

    body: { flex: 1, padding: isTiny ? 15 : 20 },
    sectionLabel: { fontSize: 10, fontWeight: '900', color: '#64748B', letterSpacing: 1.2, marginBottom: 12, marginTop: 10 },

    grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 27, flexWrap: 'wrap' },

    settingsCard: { backgroundColor: '#fff', borderRadius: 22, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden' },
    settingsInner: { flexDirection: 'row', alignItems: 'center', padding: isTiny ? 15 : 18 },
    settingsIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    settingsContent: { flex: 1, marginLeft: 12 },
    settingsTitle: { fontSize: isTiny ? 13 : 14, fontWeight: '900', color: '#0F172A' },
    settingsSub: { fontSize: isTiny ? 9 : 10, color: '#64748B', marginTop: 2 }
  });
};