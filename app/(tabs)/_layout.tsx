import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { TouchableOpacity, Text, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { clearAllStorage } from '@/utils/storage';

export default function TabLayout() {
  const router = useRouter();

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      try {
        const ok = window.confirm('Are you sure you want to logout?');
        if (ok) {
          try { await clearAllStorage(); } catch (e) { console.warn('Failed to clear storage during logout', e); }
          router.replace('/');
        }
      } catch (e) {
        Alert.alert(
          'Logout',
          'Are you sure you want to logout?',
          [
            { text: 'Cancel', onPress: () => {}, style: 'cancel' },
            { text: 'Logout', onPress: async () => { try { await clearAllStorage(); } catch (e) { console.warn(e); } router.replace('/'); }, style: 'destructive' }
          ]
        );
      }
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        { text: 'Logout', onPress: async () => { try { await clearAllStorage(); } catch (e) { console.warn(e); } router.replace('/'); }, style: 'destructive' }
      ]
    );
  };

  return (
    <Tabs
      screenOptions={{
        headerRight: () => (
          <TouchableOpacity
            onPress={handleLogout}
            style={{ marginRight: 15, flexDirection: 'row', alignItems: 'center' }}
          >
            <Ionicons name="log-out" size={20} color="#d32f2f" />
            <Text style={{ color: '#d32f2f', fontWeight: '700', marginLeft: 6 }}>Logout</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}