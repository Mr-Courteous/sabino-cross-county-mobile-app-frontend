// ─────────────────────────────────────────────────────────────
// utils/teacher-ai-api.ts
//
// Thin fetch wrapper for the Teacher AI (Teaching Assistant) module —
// Scheme of Work, Lesson Plan, Lesson Note, and the "Ask Sabino AI"
// chat. Mirrors the plain fetch + Authorization header pattern already
// used across the app (see app/staff-directory.tsx, app/score-entry.tsx)
// rather than the older apiService/API_ENDPOINTS layer, which nothing
// current in the app actually uses.
// ─────────────────────────────────────────────────────────────
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from './api-service';

export type DocType = 'scheme-of-work' | 'lesson-plans' | 'lesson-notes';
export type ContentType = 'scheme_of_work' | 'lesson_plan' | 'lesson_note';

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  'scheme-of-work': 'Scheme of Work',
  'lesson-plans': 'Lesson Plan',
  'lesson-notes': 'Lesson Note',
};

export const CONTENT_TYPE_TO_DOC_TYPE: Record<ContentType, DocType> = {
  scheme_of_work: 'scheme-of-work',
  lesson_plan: 'lesson-plans',
  lesson_note: 'lesson-notes',
};

export const DOC_TYPE_TO_CONTENT_TYPE: Record<DocType, ContentType> = {
  'scheme-of-work': 'scheme_of_work',
  'lesson-plans': 'lesson_plan',
  'lesson-notes': 'lesson_note',
};

export const DISCLAIMER = 'AI-generated content may contain errors. You are encouraged to review before use.';

export const getToken = async (): Promise<string | null> => {
  return Platform.OS !== 'web' ? await SecureStore.getItemAsync('userToken') : localStorage.getItem('userToken');
};

async function authedFetch(path: string, token: string, options: RequestInit = {}) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
}

function qs(params: Record<string, any> = {}) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

export const teacherAiApi = {
  listDocuments: (token: string, type: DocType, filters: Record<string, any> = {}) =>
    authedFetch(`/api/teacher-ai/${type}${qs(filters)}`, token),

  listApprovedDocuments: (token: string, type: DocType, filters: Record<string, any> = {}) =>
    authedFetch(`/api/teacher-ai/${type}/admin/approved${qs(filters)}`, token),

  getDocument: (token: string, type: DocType, id: number | string) =>
    authedFetch(`/api/teacher-ai/${type}/${id}`, token),

  createDocument: (token: string, type: DocType, body: any) =>
    authedFetch(`/api/teacher-ai/${type}`, token, { method: 'POST', body: JSON.stringify(body) }),

  updateDocument: (token: string, type: DocType, id: number | string, body: any) =>
    authedFetch(`/api/teacher-ai/${type}/${id}`, token, { method: 'PUT', body: JSON.stringify(body) }),

  approveDocument: (token: string, type: DocType, id: number | string) =>
    authedFetch(`/api/teacher-ai/${type}/${id}/approve`, token, { method: 'POST' }),

  deleteDocument: (token: string, type: DocType, id: number | string) =>
    authedFetch(`/api/teacher-ai/${type}/${id}`, token, { method: 'DELETE' }),

  sendChatMessage: (token: string, body: any) =>
    authedFetch(`/api/teacher-ai/chat`, token, { method: 'POST', body: JSON.stringify(body) }),

  // Composer paperclip-attach flow — extracts text from a picked
  // PDF/DOCX right after the teacher attaches it, so it can ride along
  // as `text` on the attachment when the chat message is later sent.
  // Mirrors the web-vs-native FormData branching already used for
  // document-library uploads (see app/document-library.tsx).
  extractAttachment: (token: string, file: { uri: string; name: string; mimeType?: string; webFile?: any }) => {
    const formData = new FormData();
    if (Platform.OS === 'web' && file.webFile) {
      formData.append('file', file.webFile);
    } else {
      formData.append('file', {
        uri: Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);
    }
    return fetch(`${API_BASE_URL}/api/teacher-ai/chat/attachments/extract`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  },

  listConversations: (token: string) => authedFetch(`/api/teacher-ai/chat`, token),

  getConversation: (token: string, id: number | string) => authedFetch(`/api/teacher-ai/chat/${id}`, token),

  deleteConversation: (token: string, id: number | string) =>
    authedFetch(`/api/teacher-ai/chat/${id}`, token, { method: 'DELETE' }),
};
