import { View, TextInput, TouchableOpacity, Text, ActivityIndicator, ScrollView, Alert, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Student } from '@/utils/api-calls';
import { API_BASE_URL } from '@/utils/api-service';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface ScoreRecord {
  student_id: number;
  first_name: string;
  last_name: string;
  registration_number: string;
  ca1_score?: number;
  ca2_score?: number;
  ca3_score?: number;
  ca4_score?: number;
  exam_score?: number;
  teacher_remark?: string;
}

interface ScoreEntry {
  student_id: number;
  subject_id: number;
  class_id: number;
  academic_year: string;
  term: number;
  ca1_score?: number;
  ca2_score?: number;
  ca3_score?: number;
  ca4_score?: number;
  exam_score?: number;
  teacher_remark?: string;
}

export default function ManageScoresScreen() {
  // Data
  const [academicYears, setAcademicYears] = useState<Array<{ id: number; year: string }>>([]);
  const [classes, setClasses] = useState<Array<{ id: number; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: number; name: string }>>([]);

  // Filters
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);

  // Scores data
  const [scoreRecords, setScoreRecords] = useState<ScoreRecord[]>([]);
  const [scores, setScores] = useState<{ [key: string]: Partial<ScoreEntry> }>({});
  const [loadingData, setLoadingData] = useState(true);
  const [loadingScores, setLoadingScores] = useState(false);
  const [savingScores, setSavingScores] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Load initial data on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoadingData(true);
    setError('');

    try {
      let token = localStorage.getItem('userToken');
      if (!token && Platform.OS !== 'web') {
        try {
          token = await SecureStore.getItemAsync('userToken');
        } catch (e) {}
      }

      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      };

      // Load academic years
      const yearsResponse = await fetch(`${API_BASE_URL}/academic-years`, {
        method: 'GET',
        headers,
      });
      const yearsData = await yearsResponse.json();
      const yearsArray = Array.isArray(yearsData?.data) ? yearsData.data : [];
      setAcademicYears(yearsArray);

      if (yearsArray.length > 0) {
        setSelectedYear(yearsArray[0].year);
      }

      // Load classes
      const classesResponse = await fetch(`${API_BASE_URL}/classes`, {
        method: 'GET',
        headers,
      });
      const classesData = await classesResponse.json();
      const classesArray = Array.isArray(classesData?.data) ? classesData.data : [];
      setClasses(classesArray);

      // Load subjects
      const subjectsResponse = await fetch(`${API_BASE_URL}/classes/subjects`, {
        method: 'GET',
        headers,
      });
      const subjectsData = await subjectsResponse.json();
      const subjectsArray = Array.isArray(subjectsData?.data) ? subjectsData.data : [];
      setSubjects(subjectsArray);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load initial data';
      console.error('[MANAGE-SCORES] Error loading data:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoadingData(false);
    }
  };

  // Load scores when filters change
  useEffect(() => {
    if (selectedYear && selectedTerm && selectedClassId && selectedSubjectId) {
      loadScoresForClass();
    }
  }, [selectedYear, selectedTerm, selectedClassId, selectedSubjectId]);

  const loadScoresForClass = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      return;
    }

    setLoadingScores(true);
    setError('');

    try {
      let token = localStorage.getItem('userToken');
      if (!token && Platform.OS !== 'web') {
        try {
          token = await SecureStore.getItemAsync('userToken');
        } catch (e) {}
      }

      const response = await fetch(
        `${API_BASE_URL}/scores/class?classId=${selectedClassId}&subjectId=${selectedSubjectId}&academicYear=${selectedYear}&term=${selectedTerm}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        }
      );

      const data = await response.json();
      const records = Array.isArray(data?.data) ? data.data : [];

      setScoreRecords(records);

      // Populate scores state with existing scores
      const scoresMap: { [key: string]: Partial<ScoreEntry> } = {};
      records.forEach((record: ScoreRecord) => {
        scoresMap[`${record.student_id}-ca1_score`] = { ca1_score: record.ca1_score };
        scoresMap[`${record.student_id}-ca2_score`] = { ca2_score: record.ca2_score };
        scoresMap[`${record.student_id}-ca3_score`] = { ca3_score: record.ca3_score };
        scoresMap[`${record.student_id}-ca4_score`] = { ca4_score: record.ca4_score };
        scoresMap[`${record.student_id}-exam_score`] = { exam_score: record.exam_score };
        scoresMap[`${record.student_id}-teacher_remark`] = { teacher_remark: record.teacher_remark };
      });
      setScores(scoresMap);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load scores';
      setError(errorMessage);
    } finally {
      setLoadingScores(false);
    }
  };

  const handleScoreChange = (studentId: number, field: string, value: string) => {
    const key = `${studentId}-${field}`;
    
    let numValue: number | undefined;
    if (field === 'teacher_remark') {
      // Allow text for remarks
      numValue = undefined;
    } else {
      numValue = value === '' ? undefined : Math.max(0, Math.min(100, parseInt(value) || 0));
    }

    setScores({
      ...scores,
      [key]: {
        ...scores[key],
        [field]: field === 'teacher_remark' ? value : numValue,
      },
    });
    setError('');
  };

  const handleSaveScores = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      setError('Please select both class and subject');
      return;
    }

    // Prepare score data for all students
    const scoresData: ScoreEntry[] = [];

    scoreRecords.forEach((record) => {
      const ca1_score = scores[`${record.student_id}-ca1_score`]?.ca1_score;
      const ca2_score = scores[`${record.student_id}-ca2_score`]?.ca2_score;
      const ca3_score = scores[`${record.student_id}-ca3_score`]?.ca3_score;
      const ca4_score = scores[`${record.student_id}-ca4_score`]?.ca4_score;
      const exam_score = scores[`${record.student_id}-exam_score`]?.exam_score;
      const teacher_remark = scores[`${record.student_id}-teacher_remark`]?.teacher_remark;

      scoresData.push({
        student_id: record.student_id,
        subject_id: selectedSubjectId,
        class_id: selectedClassId,
        academic_year: selectedYear,
        term: parseInt(selectedTerm),
        ca1_score,
        ca2_score,
        ca3_score,
        ca4_score,
        exam_score,
        teacher_remark,
      });
    });

    setSavingScores(true);
    setError('');
    setSuccessMsg('');

    try {
      let token = localStorage.getItem('userToken');
      if (!token && Platform.OS !== 'web') {
        try {
          token = await SecureStore.getItemAsync('userToken');
        } catch (e) {}
      }

      const result = await fetch(`${API_BASE_URL}/scores/bulk-upsert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ scores: scoresData }),
      });

      const data = await result.json();

      if (result.ok && data.success) {
        setSuccessMsg(`Saved scores for ${scoresData.length} student${scoresData.length !== 1 ? 's' : ''}`);

        // Clear message after 2 seconds
        setTimeout(() => {
          setSuccessMsg('');
        }, 2000);
      } else {
        setError(data.message || 'Failed to save scores');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save scores';
      setError(errorMessage);
    } finally {
      setSavingScores(false);
    }
  };

  if (loadingData) {
    return (
      <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <ThemedText style={{ marginTop: 16 }}>Loading data...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1, padding: 16 }}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <ThemedText type="title" style={{ marginBottom: 8 }}>
            Manage Scores
          </ThemedText>
          <ThemedText style={{ opacity: 0.7, fontSize: 14 }}>
            Update and manage student scores
          </ThemedText>
        </View>

        {/* Filters */}
        <View style={{ marginBottom: 20 }}>
          <ThemedText style={{ fontWeight: '600', marginBottom: 10 }}>
            Filters
          </ThemedText>

          {/* Academic Year */}
          <View style={{ marginBottom: 12 }}>
            <ThemedText style={{ fontSize: 12, marginBottom: 6, opacity: 0.7 }}>
              Academic Year *
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {academicYears.map((year) => (
                  <TouchableOpacity
                    key={year.id}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 14,
                      borderRadius: 6,
                      borderWidth: 2,
                      borderColor: selectedYear === year.year ? '#4CAF50' : '#ddd',
                      backgroundColor: selectedYear === year.year ? '#e8f5e9' : '#fff',
                    }}
                    onPress={() => setSelectedYear(year.year)}
                  >
                    <ThemedText
                      style={{
                        fontWeight: '600',
                        color: selectedYear === year.year ? '#4CAF50' : '#666',
                        fontSize: 13,
                      }}
                    >
                      {year.year}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Term */}
          <View style={{ marginBottom: 12 }}>
            <ThemedText style={{ fontSize: 12, marginBottom: 6, opacity: 0.7 }}>
              Term *
            </ThemedText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['1', '2', '3'].map((term) => (
                <TouchableOpacity
                  key={term}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: selectedTerm === term ? '#4CAF50' : '#ddd',
                    backgroundColor: selectedTerm === term ? '#e8f5e9' : '#fff',
                    alignItems: 'center',
                  }}
                  onPress={() => setSelectedTerm(term)}
                >
                  <ThemedText
                    style={{
                      fontWeight: '600',
                      color: selectedTerm === term ? '#4CAF50' : '#666',
                    }}
                  >
                    Term {term}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Class */}
          <View style={{ marginBottom: 12 }}>
            <ThemedText style={{ fontSize: 12, marginBottom: 6, opacity: 0.7 }}>
              Class *
            </ThemedText>
            {classes.length === 0 ? (
              <ThemedText style={{ color: '#999', fontSize: 13 }}>
                No classes available.
              </ThemedText>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {classes.map((cls) => (
                    <TouchableOpacity
                      key={cls.id}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: selectedClassId === cls.id ? '#4CAF50' : '#ddd',
                        backgroundColor: selectedClassId === cls.id ? '#e8f5e9' : '#fff',
                      }}
                      onPress={() => {
                        setSelectedClassId(cls.id);
                        setSelectedClass(cls.name);
                      }}
                    >
                      <ThemedText
                        style={{
                          fontWeight: '600',
                          color: selectedClassId === cls.id ? '#4CAF50' : '#666',
                          fontSize: 13,
                        }}
                      >
                        {cls.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* Subject */}
          <View>
            <ThemedText style={{ fontSize: 12, marginBottom: 6, opacity: 0.7 }}>
              Subject *
            </ThemedText>
            {subjects.length === 0 ? (
              <ThemedText style={{ color: '#999', fontSize: 13 }}>
                No subjects available.
              </ThemedText>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {subjects.map((subject) => (
                    <TouchableOpacity
                      key={subject.id}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 14,
                        borderRadius: 6,
                        borderWidth: 2,
                        borderColor: selectedSubjectId === subject.id ? '#4CAF50' : '#ddd',
                        backgroundColor: selectedSubjectId === subject.id ? '#e8f5e9' : '#fff',
                      }}
                      onPress={() => {
                        setSelectedSubjectId(subject.id);
                        setSelectedSubject(subject.name);
                      }}
                    >
                      <ThemedText
                        style={{
                          fontWeight: '600',
                          color: selectedSubjectId === subject.id ? '#4CAF50' : '#666',
                          fontSize: 13,
                        }}
                      >
                        {subject.name}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>

        {/* Error Message */}
        {error ? (
          <View
            style={{
              backgroundColor: '#ffebee',
              borderLeftColor: '#d32f2f',
              borderLeftWidth: 5,
              padding: 14,
              borderRadius: 6,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#ffcdd2',
            }}
          >
            <ThemedText style={{ color: '#c62828', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
              ❌ Error
            </ThemedText>
            <ThemedText style={{ color: '#b71c1c', fontSize: 14 }}>
              {error}
            </ThemedText>
          </View>
        ) : null}

        {/* Success Message */}
        {successMsg ? (
          <View
            style={{
              backgroundColor: '#e8f5e9',
              borderLeftColor: '#4CAF50',
              borderLeftWidth: 5,
              padding: 14,
              borderRadius: 6,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#c8e6c9',
            }}
          >
            <ThemedText style={{ color: '#2e7d32', fontSize: 14, fontWeight: '600' }}>
              ✅ {successMsg}
            </ThemedText>
          </View>
        ) : null}

        {/* Loading Scores */}
        {loadingScores ? (
          <View style={{ alignItems: 'center', paddingVertical: 20 }}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <ThemedText style={{ marginTop: 12 }}>Loading scores...</ThemedText>
          </View>
        ) : selectedClassId && selectedSubjectId ? (
          // Score Table
          <View>
            <ThemedText style={{ fontWeight: '600', marginBottom: 12, fontSize: 14 }}>
              {selectedClass} - {selectedSubject}
            </ThemedText>

            {scoreRecords.length === 0 ? (
              <View
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <ThemedText style={{ opacity: 0.7 }}>
                  No students in this class
                </ThemedText>
              </View>
            ) : (
              <View>
                {/* Column Headers */}
                <View
                  style={{
                    flexDirection: 'row',
                    backgroundColor: '#4CAF50',
                    borderRadius: 6,
                    overflow: 'hidden',
                    marginBottom: 8,
                  }}
                >
                  <View style={{ flex: 2, padding: 10 }}>
                    <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>
                      Student
                    </ThemedText>
                  </View>
                  {['CA1', 'CA2', 'CA3', 'CA4', 'Exam'].map((col) => (
                    <View key={col} style={{ flex: 1, padding: 8, alignItems: 'center' }}>
                      <ThemedText style={{ color: '#fff', fontWeight: '600', fontSize: 11 }}>
                        {col}
                      </ThemedText>
                    </View>
                  ))}
                </View>

                {/* Score Rows */}
                {scoreRecords.map((record) => (
                  <View
                    key={record.student_id}
                    style={{
                      flexDirection: 'row',
                      backgroundColor: '#f9f9f9',
                      borderWidth: 1,
                      borderColor: '#eee',
                      borderRadius: 6,
                      marginBottom: 8,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Student Name */}
                    <View style={{ flex: 2, padding: 10, justifyContent: 'center' }}>
                      <ThemedText style={{ fontWeight: '600', fontSize: 13 }}>
                        {record.first_name} {record.last_name}
                      </ThemedText>
                      {record.registration_number && (
                        <ThemedText style={{ fontSize: 10, opacity: 0.6 }}>
                          {record.registration_number}
                        </ThemedText>
                      )}
                    </View>

                    {/* Score Inputs */}
                    {[
                      { key: 'ca1_score', label: 'CA1' },
                      { key: 'ca2_score', label: 'CA2' },
                      { key: 'ca3_score', label: 'CA3' },
                      { key: 'ca4_score', label: 'CA4' },
                      { key: 'exam_score', label: 'Exam' },
                    ].map((field) => (
                      <View key={field.key} style={{ flex: 1, padding: 6 }}>
                        <TextInput
                          style={{
                            borderWidth: 1,
                            borderColor: '#ddd',
                            borderRadius: 4,
                            padding: 6,
                            fontSize: 12,
                            backgroundColor: '#fff',
                            textAlign: 'center',
                          }}
                          placeholder="0"
                          placeholderTextColor="#ccc"
                          value={
                            scores[`${record.student_id}-${field.key}`]?.[field.key as keyof ScoreEntry]
                              ?.toString() || ''
                          }
                          onChangeText={(text) =>
                            handleScoreChange(record.student_id, field.key, text)
                          }
                          keyboardType="numeric"
                          maxLength={3}
                        />
                      </View>
                    ))}
                  </View>
                ))}

                {/* Save Button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: savingScores ? '#ccc' : '#4CAF50',
                    padding: 14,
                    borderRadius: 8,
                    alignItems: 'center',
                    marginTop: 16,
                    opacity: savingScores ? 0.6 : 1,
                  }}
                  onPress={handleSaveScores}
                  disabled={savingScores}
                >
                  {savingScores ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                      <ThemedText style={{ color: '#fff', fontWeight: '600' }}>
                        Saving Scores...
                      </ThemedText>
                    </View>
                  ) : (
                    <ThemedText style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                      Save All Scores
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View
            style={{
              backgroundColor: '#e3f2fd',
              padding: 16,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <ThemedText style={{ fontSize: 14, marginBottom: 4, fontWeight: '600' }}>
              Select Class & Subject
            </ThemedText>
            <ThemedText style={{ fontSize: 12, opacity: 0.7, textAlign: 'center' }}>
              Use the filters above to view and edit scores for a specific class and subject
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}
