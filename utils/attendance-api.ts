// ─────────────────────────────────────────────────────────────
// utils/attendance-api.ts
//
// Thin fetch wrapper for the Attendance Register module
// (routes/attendance/index.js on the backend). Mirrors the plain
// fetch + Authorization header pattern already used across the app
// (see utils/teacher-ai-api.ts, app/score-entry.tsx) rather than the
// older apiService/API_ENDPOINTS layer.
//
// Class-scoping (owner/admin -> any class, class_teacher -> only
// their assigned class) is enforced server-side by
// requireClassAccess() in routes/attendance/db.js. This file just
// forwards whatever the backend decides — a class_teacher trying to
// hit another class will get back a 403 with code
// 'CLASS_SCOPE_VIOLATION', and an unassigned class_teacher gets
// 'NOT_ASSIGNED_TO_CLASS' on every route. The screen is responsible
// for reading those codes and showing the right message.
// ─────────────────────────────────────────────────────────────
import { API_BASE_URL } from './api-service';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'sick' | 'excused';
export type AttendancePeriod = 'full_day' | 'morning' | 'afternoon';

export interface AttendanceClass {
  id: number;
  class_name: string;
  capacity?: number;
}

export interface AttendanceLegendItem {
  code: string;
  status: AttendanceStatus;
  label: string;
}

// One row per date that has saved records — powers the date-picker's
// dot indicators (see GET /api/attendance/dates/:classId).
export interface AttendanceDateSummary {
  date: string;
  periods: AttendancePeriod[];
  markedCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  sickCount: number;
  excusedCount: number;
}

// Full-term register: every student against every saved date (see
// GET /api/attendance/broadsheet/:classId).
export interface BroadsheetStudentRow {
  enrollmentId: number;
  serial: number | null;
  firstName: string;
  lastName: string;
  registrationNumber?: string;
  gender?: string;
  days: Record<string, AttendanceStatus | null>;
  totalPresent: number;
  totalAbsent: number;
  percentageAttendance: number | null;
}

export interface BroadsheetDailyTotal {
  date: string;
  boysPresent: number;
  girlsPresent: number;
  totalPresent: number;
}

export interface BroadsheetData {
  period: AttendancePeriod;
  dates: string[];
  students: BroadsheetStudentRow[];
  dailyTotals: BroadsheetDailyTotal[];
}

export interface AttendanceResult<T = any> {
  ok: boolean;
  status: number;
  json: {
    success: boolean;
    error?: string;
    code?: string;
    data?: T;
    count?: number;
    markedCount?: number;
  };
}

async function authedFetch(path: string, token: string, options: RequestInit = {}): Promise<AttendanceResult> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  let json: any = {};
  try {
    json = await res.json();
  } catch (e) {
    json = { success: false, error: 'Unexpected server response.' };
  }
  return { ok: res.ok, status: res.status, json };
}

function qs(params: Record<string, any> = {}) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export const attendanceApi = {
  // Classes the logged-in account may take attendance for.
  getClasses: (token: string) => authedFetch('/api/attendance/classes', token),

  // Legend + valid periods, for rendering the key.
  getLegend: (token: string) => authedFetch('/api/attendance/legend', token),

  // Class roster (bio-data section).
  getRoster: (token: string, classId: number, sessionId: number) =>
    authedFetch(`/api/attendance/roster/${classId}${qs({ sessionId })}`, token),

  // Roster merged with a specific day's marks.
  getDay: (
    token: string,
    classId: number,
    params: { sessionId: number; date: string; period: AttendancePeriod }
  ) => authedFetch(`/api/attendance/day/${classId}${qs(params)}`, token),

  // Bulk roll-call submission for one class/date/period.
  markAttendance: (
    token: string,
    body: {
      classId: number;
      sessionId: number;
      term: number;
      date: string;
      period: AttendancePeriod;
      records: { enrollmentId: number; status: AttendanceStatus; remarks?: string }[];
    }
  ) => authedFetch('/api/attendance/mark', token, { method: 'POST', body: JSON.stringify(body) }),

  // Dates that have saved records — powers the date-picker's dots.
  getDates: (
    token: string,
    classId: number,
    params: { sessionId: number; term?: number; period?: AttendancePeriod }
  ) => authedFetch(`/api/attendance/dates/${classId}${qs(params)}`, token),

  // Full-term register: every student against every saved date.
  getBroadsheet: (
    token: string,
    classId: number,
    params: { sessionId: number; term: number; period: AttendancePeriod }
  ) => authedFetch(`/api/attendance/broadsheet/${classId}${qs(params)}`, token),

  // Absolute URL for the downloadable PDF version of the broadsheet
  // above. Not a fetch — used with FileSystem.downloadAsync since the
  // response is a PDF file, not JSON.
  getBroadsheetPdfUrl: (
    classId: number,
    params: { sessionId: number; term: number; period: AttendancePeriod }
  ) => `${API_BASE_URL}/api/attendance/broadsheet/${classId}/pdf${qs(params)}`,

  // Monday-Friday grid for the week containing weekStart.
  getWeek: (
    token: string,
    classId: number,
    params: { sessionId: number; weekStart: string; period: AttendancePeriod }
  ) => authedFetch(`/api/attendance/week/${classId}${qs(params)}`, token),

  // Terminal / sessional summary per student.
  getSummary: (
    token: string,
    classId: number,
    params: { sessionId: number; term: number; minPercentage?: number }
  ) => authedFetch(`/api/attendance/summary/${classId}${qs(params)}`, token),

  // Per-student terminal remark.
  putRemarks: (
    token: string,
    classId: number,
    body: { sessionId: number; term: number; enrollmentId: number; remarks: string }
  ) =>
    authedFetch(`/api/attendance/summary/${classId}/remarks`, token, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  // Weekly sign-off trail (teacher / principal / inspector).
  getSignoff: (
    token: string,
    classId: number,
    params: { sessionId: number; term: number; weekNumber: number }
  ) => authedFetch(`/api/attendance/signoff/${classId}${qs(params)}`, token),

  postSignoff: (
    token: string,
    classId: number,
    body: {
      sessionId: number;
      term: number;
      weekNumber: number;
      role: 'teacher' | 'principal' | 'inspector';
      name?: string;
      notes?: string;
    }
  ) => authedFetch(`/api/attendance/signoff/${classId}`, token, { method: 'POST', body: JSON.stringify(body) }),
};

// Fallback legend/periods so the UI can render instantly before the
// network call resolves — kept in sync with routes/attendance/db.js.
export const DEFAULT_LEGEND: AttendanceLegendItem[] = [
  { code: '/', status: 'present', label: 'Present' },
  { code: 'A', status: 'absent', label: 'Absent' },
  { code: 'L', status: 'late', label: 'Late' },
  { code: 'I', status: 'sick', label: 'Ill / Sick' },
  { code: 'E', status: 'excused', label: 'Excused' },
];

export const STATUS_COLORS: Record<AttendanceStatus, string> = {
  present: '#22C55E',
  absent: '#EF4444',
  late: '#F59E0B',
  sick: '#8B5CF6',
  excused: '#64748B',
};

export const STATUS_ORDER: AttendanceStatus[] = ['present', 'absent', 'late', 'sick', 'excused'];
