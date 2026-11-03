// Type definitions for the application
// Components should import these types and make direct API calls using apiService

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

export interface AcademicYear {
    id: number;
    year: string;
}

export interface Class {
    id: number;
    name: string;
}

export interface Subject {
    id: number;
    name: string;
}
