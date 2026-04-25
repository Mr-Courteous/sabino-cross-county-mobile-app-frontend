import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/design-system';
import { CustomButton } from './custom-button';

interface Subject {
  id: number;
  name: string;
  category?: string;
  education_level?: string;
}

interface BulkSubjectSelectorProps {
  visible: boolean;
  subjects: Subject[];
  selectedSubjectIds: number[];
  onSelectionChange: (selectedIds: number[]) => void;
  onConfirm: (selectedSubjects: Subject[]) => void;
  onCancel: () => void;
  loading?: boolean;
  classId?: number;
  sessionName?: string;
  term?: number;
}

export const BulkSubjectSelector: React.FC<BulkSubjectSelectorProps> = ({
  visible,
  subjects,
  selectedSubjectIds,
  onSelectionChange,
  onConfirm,
  onCancel,
  loading = false,
  classId,
  sessionName,
  term,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [initializing, setInitializing] = useState(false);

  const filteredSubjects = searchQuery
    ? subjects.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.category && s.category.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : subjects;

  const toggleSubject = useCallback((subjectId: number) => {
    if (selectedSubjectIds.includes(subjectId)) {
      onSelectionChange(selectedSubjectIds.filter(id => id !== subjectId));
    } else {
      onSelectionChange([...selectedSubjectIds, subjectId]);
    }
  }, [selectedSubjectIds, onSelectionChange]);

  const handleConfirm = useCallback(() => {
    setInitializing(true);
    const selectedSubjects = subjects.filter(s => selectedSubjectIds.includes(s.id));
    onConfirm(selectedSubjects);
    setTimeout(() => setInitializing(false), 1000);
  }, [selectedSubjectIds, subjects, onConfirm]);

  const handleSelectAll = useCallback(() => {
    if (selectedSubjectIds.length === filteredSubjects.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredSubjects.map(s => s.id));
    }
  }, [filteredSubjects, selectedSubjectIds, onSelectionChange]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Ionicons name="close" size={28} color={Colors.accent.gold} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Subjects in Bulk</Text>
          <View style={{ width: 28 }} />
        </View>

        {classId && sessionName && term && (
          <View style={styles.contextInfo}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.accent.gold} />
            <Text style={styles.contextText}>
              Class • Term {term} • {sessionName}
            </Text>
          </View>
        )}

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="rgba(255,255,255,0.3)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search subjects..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Select All */}
        <View style={styles.selectAllContainer}>
          <TouchableOpacity
            style={[
              styles.selectAllButton,
              selectedSubjectIds.length > 0 && styles.selectAllButtonActive,
            ]}
            onPress={handleSelectAll}
          >
            <Ionicons
              name={
                selectedSubjectIds.length === filteredSubjects.length && filteredSubjects.length > 0
                  ? 'checkbox'
                  : 'square-outline'
              }
              size={20}
              color={
                selectedSubjectIds.length > 0 ? Colors.accent.gold : 'rgba(255,255,255,0.3)'
              }
            />
            <Text style={styles.selectAllText}>
              {selectedSubjectIds.length === filteredSubjects.length && filteredSubjects.length > 0
                ? `All Selected (${selectedSubjectIds.length})`
                : `Select All (${filteredSubjects.length})`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Subject List */}
        <FlatList
          data={filteredSubjects}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => {
            const isSelected = selectedSubjectIds.includes(item.id);
            return (
              <TouchableOpacity
                style={[styles.subjectItem, isSelected && styles.subjectItemSelected]}
                onPress={() => toggleSubject(item.id)}
              >
                <View style={styles.checkboxContainer}>
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={isSelected ? Colors.accent.gold : 'rgba(255,255,255,0.3)'}
                  />
                </View>
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectName}>{item.name}</Text>
                  {item.category && (
                    <Text style={styles.subjectCategory}>{item.category}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          style={styles.subjectList}
          scrollEnabled={true}
        />

        {/* Summary & Actions */}
        <View style={styles.footer}>
          <View style={styles.summary}>
            <Text style={styles.summaryText}>
              {selectedSubjectIds.length === 0
                ? 'Select subjects to add'
                : `${selectedSubjectIds.length} subject${selectedSubjectIds.length !== 1 ? 's' : ''} selected`}
            </Text>
          </View>

          <View style={styles.actions}>
            <CustomButton
              text="Cancel"
              onPress={onCancel}
              backgroundColor="transparent"
              textColor={Colors.accent.gold}
              borderColor={Colors.accent.gold}
              borderWidth={1}
            />
            <CustomButton
              text={initializing ? 'Initializing...' : `Initialize (${selectedSubjectIds.length})`}
              onPress={handleConfirm}
              backgroundColor={selectedSubjectIds.length > 0 ? Colors.accent.gold : 'rgba(250,204,21,0.3)'}
              textColor={Colors.accent.navy}
              disabled={selectedSubjectIds.length === 0 || loading || initializing}
            />
          </View>
        </View>

        {(loading || initializing) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.accent.gold} />
            <Text style={styles.loadingText}>
              {initializing ? 'Initializing subjects...' : 'Loading...'}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.accent.navy,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    flex: 1,
    textAlign: 'center',
  },
  contextInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 24,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(250,204,21,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(250,204,21,0.3)',
  },
  contextText: {
    color: Colors.accent.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 24,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 46,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    color: '#FFFFFF',
    fontSize: 14,
  },
  selectAllContainer: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  selectAllButtonActive: {
    backgroundColor: 'rgba(250,204,21,0.1)',
    borderColor: 'rgba(250,204,21,0.3)',
  },
  selectAllText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  subjectList: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  subjectItemSelected: {
    backgroundColor: 'rgba(250,204,21,0.1)',
    borderColor: 'rgba(250,204,21,0.3)',
  },
  checkboxContainer: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectInfo: {
    flex: 1,
  },
  subjectName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  subjectCategory: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(30,41,59,0.5)',
    gap: 12,
  },
  summary: {
    paddingVertical: 8,
  },
  summaryText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: Colors.accent.gold,
    fontSize: 14,
    fontWeight: '700',
  },
});
