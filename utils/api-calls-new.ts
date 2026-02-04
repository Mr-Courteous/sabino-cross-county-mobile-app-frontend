import { apiService } from './api-service';
import { API_ENDPOINTS } from './api-config';

// ============ TYPES ============

export interface User {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
}

export interface School {
    id: number;
    name: string;
    registration_code?: string;
    email?: string;
    school_type?: string;
    address?: string;
    phone?: string;
    created_at?: string;
}

export interface Student {
    id: number;
    first_name: string;
    last_name: string;
    admission_number?: string;
    class_id?: number;
    class_name_text?: string;
    date_of_birth?: string;
    gender?: string;
    address?: string;
    phone?: string;
    parent_name?: string;
    parent_phone?: string;
    email?: string;
    created_at?: string;
}

export interface StudentInput {
    firstName: string;
    lastName: string;
    registrationNumber?: string;
    classId?: number;
    classNameText?: string;
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    phone?: string;
    parentName?: string;
    parentPhone?: string;
    email?: string;
}

export interface Score {
    student_id: number;
    subject_id: number;
    class_id: number;
    academic_year: number;
    term: string;
    ca1_score?: number;
    ca2_score?: number;
    ca3_score?: number;
    ca4_score?: number;
    exam_score?: number;
    teacher_remark?: string;
}

// ============ AUTH API ============

export const authApi = {
    /**
     * Login to existing school account
     */
    login: async (email: string, password: string) => {
        const response = await apiService.post<{
            success: boolean;
            token: string;
            user: {
                schoolId: number;
                email: string;
                name: string;
                type: string;
            };
        }>(API_ENDPOINTS.LOGIN, {
            email,
            password,
        });

        if (response.success && response.data?.token) {
            apiService.setToken(response.data.token);
        }

        return response;
    },
};

// ============ SCHOOL API ============

export const schoolApi = {
    /**
     * Step 1: Send OTP to email for verification
     */
    sendOTP: async (email: string) => {
        return await apiService.post<{
            success: boolean;
            message: string;
        }>(API_ENDPOINTS.SCHOOLS_OTP, { email });
    },

    /**
     * Step 2: Complete registration with OTP verification
     */
    completeRegistration: async (data: {
        email: string;
        otp: string;
        password: string;
        firstName: string;
        lastName: string;
        phone?: string;
        schoolName: string;
        schoolType?: string;
    }) => {
        const response = await apiService.post<{
            success: boolean;
            message: string;
            token?: string;
            registration_code?: string;
            school?: School;
        }>(API_ENDPOINTS.SCHOOLS, {
            email: data.email,
            otp: data.otp,
            password: data.password,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            name: data.schoolName,
            school_type: data.schoolType,
        });

        // Auto-login if registration successful
        if (response.success && response.data?.token) {
            apiService.setToken(response.data.token);
        }

        return response;
    },

    /**
     * Get school details
     */
    getById: async (id: number) => {
        return await apiService.get<School>(
            API_ENDPOINTS.SCHOOL_DETAILS(id)
        );
    },
};

// ============ STUDENT API ============

export const studentApi = {
    /**
     * Get all students for the authenticated school
     */
    getAll: async () => {
        return await apiService.get<{
            success: boolean;
            data: Student[];
            count: number;
        }>(API_ENDPOINTS.STUDENTS);
    },

    /**
     * Create a single student
     */
    createSingle: async (student: StudentInput) => {
        return await apiService.post<{
            success: boolean;
            student: Student;
        }>(API_ENDPOINTS.STUDENTS, {
            firstName: student.firstName,
            lastName: student.lastName,
            registrationNumber: student.registrationNumber,
            classId: student.classId,
            classNameText: student.classNameText,
            dateOfBirth: student.dateOfBirth,
            gender: student.gender,
            address: student.address,
            phone: student.phone,
            parentName: student.parentName,
            parentPhone: student.parentPhone,
            email: student.email,
        });
    },

    /**
     * Create multiple students at once (bulk import)
     */
    createBulk: async (students: StudentInput[]) => {
        return await apiService.post<{
            success: boolean;
            message: string;
            data: Student[];
        }>(API_ENDPOINTS.STUDENT_BULK, {
            students: students.map(s => ({
                firstName: s.firstName,
                lastName: s.lastName,
                registrationNumber: s.registrationNumber,
                gender: s.gender,
                dateOfBirth: s.dateOfBirth,
                phone: s.phone,
                email: s.email,
            })),
        });
    },

    /**
     * Get a specific student by ID
     */
    getById: async (id: number) => {
        return await apiService.get<Student>(
            API_ENDPOINTS.STUDENT_DETAILS(id)
        );
    },

    /**
     * Update a student
     */
    update: async (id: number, updates: Partial<StudentInput>) => {
        return await apiService.put<{
            success: boolean;
            student: Student;
        }>(API_ENDPOINTS.STUDENT_DETAILS(id), updates);
    },
};

// ============ SCORE API ============

export const scoreApi = {
    /**
     * Upsert (insert or update) multiple scores at once
     * If a score exists for (student, subject, year, term), it updates.
     * Otherwise, it creates a new record.
     */
    upsertBulk: async (scores: Score[]) => {
        return await apiService.post<{
            success: boolean;
            message: string;
            data: Score[];
        }>(API_ENDPOINTS.SCORES_BULK_UPSERT, { scores });
    },

    /**
     * Get all scores for a specific class and subject
     */
    getClassScores: async (
        classId: number,
        subjectId: number,
        academicYear: number,
        term: string
    ) => {
        return await apiService.get<{
            success: boolean;
            data: any[];
        }>(
            `${API_ENDPOINTS.SCORES_CLASS}?classId=${classId}&subjectId=${subjectId}&academicYear=${academicYear}&term=${term}`
        );
    },
};
