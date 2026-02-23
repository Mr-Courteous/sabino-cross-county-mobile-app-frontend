import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type FooterProps = {
  themeColor?: string;
  schoolName?: string | null;
  onLogout: () => void;
};

export default function Footer({ themeColor = '#FACC15', schoolName = 'Sabino Academy', onLogout }: FooterProps) {
  return (
    <View style={styles.wrap}>
      <LinearGradient colors={[themeColor + '10', '#ffffff00']} style={[styles.container, { borderColor: themeColor + '22' }]}> 
        <View style={styles.row}>
          <View style={styles.brandRow}>
            <View style={[styles.brandCircle, { backgroundColor: themeColor + '20' }]}>
              <Ionicons name="school" size={18} color={themeColor} />
            </View>
            <Text style={styles.schoolName} numberOfLines={1}>{schoolName || 'SABINO ACADEMY'}</Text>
          </View>

          <TouchableOpacity style={[styles.logoutBtn, { borderColor: themeColor }]} onPress={onLogout} activeOpacity={0.8}>
            <Ionicons name="power" size={16} color={themeColor} />
            <Text style={[styles.logoutText, { color: themeColor }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.copy}>© {new Date().getFullYear()} {schoolName || 'Sabino Academy'}. All rights reserved.</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 18, paddingHorizontal: 20, paddingBottom: 8 },
  container: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  brandCircle: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  schoolName: { fontSize: 13, fontWeight: '900', color: '#0F172A', flexShrink: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  logoutText: { marginLeft: 8, fontWeight: '900', fontSize: 12 },
  copy: { marginTop: 10, fontSize: 11, color: '#64748B', fontWeight: '700' }
});
