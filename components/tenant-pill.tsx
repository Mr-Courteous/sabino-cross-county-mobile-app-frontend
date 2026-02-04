import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TenantPill({ tenants = ['Sabino HS', 'Green Valley', "St. Mary's"] }: { tenants?: string[] }) {
  const [index, setIndex] = useState(0);

  function next() {
    setIndex((i) => (i + 1) % tenants.length);
  }

  return (
    <TouchableOpacity style={styles.pill} onPress={next} activeOpacity={0.85}>
      <View>
        <Text style={styles.title}>Tenant</Text>
        <Text style={styles.name}>{tenants[index]}</Text>
      </View>
      <Text style={styles.hint}>Switch</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 2,
    minWidth: 140,
  },
  title: { fontSize: 10, color: '#666' },
  name: { fontSize: 14, fontWeight: '700', color: '#1a73e8' },
  hint: { fontSize: 12, color: '#888' },
});
