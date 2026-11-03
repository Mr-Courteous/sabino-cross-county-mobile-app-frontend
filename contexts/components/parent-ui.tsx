import { View, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/design-system';
import { ThemedText } from '@/components/themed-text';

/** Small UI pieces shared by the parent screens. */

export const Field = ({ C, label, ...props }: any) => (
  <View style={{ marginBottom: 14 }}>
    {!!label && <ThemedText style={{ fontSize: 11, fontWeight: '800', letterSpacing: 1, color: C.textSecondary, marginBottom: 6 }}>{label}</ThemedText>}
    <TextInput
      placeholderTextColor={C.textMuted}
      style={{
        height: 48, borderRadius: 12, borderWidth: 1, borderColor: C.inputBorder,
        backgroundColor: C.inputBg, color: C.inputText, paddingHorizontal: 14, fontSize: 14,
        ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
      }}
      {...props}
    />
  </View>
);

export const PrimaryButton = ({ title, onPress, loading, disabled, outline, C }: any) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    disabled={loading || disabled}
    style={{
      minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
      backgroundColor: outline ? 'transparent' : '#2563EB',
      borderWidth: outline ? 1.5 : 0, borderColor: '#2563EB',
      opacity: loading || disabled ? 0.55 : 1, paddingHorizontal: 18,
    }}
  >
    {loading ? <ActivityIndicator color={outline ? '#2563EB' : '#fff'} /> : (
      <ThemedText style={{ color: outline ? '#2563EB' : '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 0.6 }}>{title}</ThemedText>
    )}
  </TouchableOpacity>
);

export const ScreenHeader = ({ C, title, onBack, right }: any) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 54, paddingHorizontal: 16, paddingBottom: 10 }}>
    {onBack ? (
      <TouchableOpacity onPress={onBack} style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface }}>
        <Ionicons name="arrow-back" size={20} color={C.text} />
      </TouchableOpacity>
    ) : <View style={{ width: 38 }} />}
    <ThemedText style={{ fontSize: 17, fontWeight: '800', color: C.text, flex: 1, textAlign: 'center' }} numberOfLines={1}>{title}</ThemedText>
    <View style={{ minWidth: 38, alignItems: 'flex-end' }}>{right}</View>
  </View>
);

export const cardStyle = (C: any) => ({
  backgroundColor: C.surface, borderRadius: 18, padding: 14, marginBottom: 12,
  borderWidth: 1, borderColor: C.divider,
});

export const gradeColor = (percent: number) => {
  if (percent >= 75) return '#10B981';
  if (percent >= 65) return '#3B82F6';
  if (percent >= 55) return Colors.accent.gold;
  if (percent >= 45) return '#FB923C';
  return '#EF4444';
};

export const sharedStyles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  link: { color: '#2563EB', fontWeight: '800', fontSize: 12 },
});
