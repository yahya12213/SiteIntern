// Types pour les sessions de formation et inscriptions

export type SessionStatus = 'planned' | 'active' | 'completed' | 'cancelled';
export type EnrollmentStatus = 'enrolled' | 'completed' | 'dropped';

export interface FormationSession {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  segment_id?: string;
  city_id?: string;
  segment_name?: string;
  city_name?: string;
  instructor_id?: string;
  instructor_name?: string;
  instructor_username?: string;
  max_capacity?: number;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
  enrolled_count?: number;
  students?: EnrolledStudent[];
}

export interface EnrolledStudent {
  enrollment_id: string;
  enrollment_date: string;
  enrollment_status: EnrollmentStatus;
  notes?: string;
  student_id: string;
  student_name: string;
  student_username: string;
  role?: string;
}

export interface FormationEnrollment {
  id: string;
  session_id: string;
  student_id: string;
  enrollment_date: string;
  status: EnrollmentStatus;
  notes?: string;
}

export interface AvailableStudent {
  id: string;
  username: string;
  full_name: string;
  role: string;
}

export interface FormationStats {
  sessions: {
    total: number;
    planned: number;
    active: number;
    completed: number;
    cancelled: number;
  };
  total_students_enrolled: number;
  top_sessions: Array<{
    id: string;
    name: string;
    enrollment_count: number;
  }>;
}

// Interfaces pour les inputs API
export interface CreateSessionInput {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  segment_id?: string;
  city_id?: string;
  instructor_id?: string;
  max_capacity?: number;
  status?: SessionStatus;
}

export interface UpdateSessionInput {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  segment_id?: string;
  city_id?: string;
  instructor_id?: string;
  max_capacity?: number;
  status?: SessionStatus;
}

export interface EnrollStudentsInput {
  student_ids: string[];
}
