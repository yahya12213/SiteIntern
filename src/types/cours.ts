// Types pour les formations en ligne (cours)

export type FormationLevel = 'debutant' | 'intermediaire' | 'avance';
export type FormationStatus = 'draft' | 'published';
export type ModuleType = 'video' | 'test' | 'document';
export type QuestionType = 'multiple_choice';

// Formation (cours en ligne)
export interface Formation {
  id: string;
  title: string;
  description?: string;
  price?: number | string; // PostgreSQL DECIMAL est renvoyé comme string
  duration_hours?: number;
  level?: FormationLevel;
  thumbnail_url?: string;
  status: FormationStatus;
  passing_score_percentage: number;
  default_certificate_template_id?: string;
  certificate_template_name?: string; // Nom du template (depuis JOIN backend)
  created_at: string;
  updated_at: string;
  module_count?: number;
  modules?: FormationModule[];
}

// Module de formation
export interface FormationModule {
  id: string;
  formation_id: string;
  title: string;
  description?: string;
  order_index: number;
  prerequisite_module_id?: string;
  module_type: ModuleType;
  created_at: string;
  videos?: ModuleVideo[];
  tests?: ModuleTest[];
}

// Vidéo d'un module
export interface ModuleVideo {
  id: string;
  module_id: string;
  title: string;
  youtube_url: string;
  duration_seconds?: number;
  description?: string;
  order_index: number;
  created_at: string;
}

// Test d'un module
export interface ModuleTest {
  id: string;
  module_id: string;
  title: string;
  description?: string;
  passing_score: number;
  time_limit_minutes?: number;
  max_attempts?: number;
  show_correct_answers: boolean;
  created_at: string;
  questions?: TestQuestion[];
}

// Question de test
export interface TestQuestion {
  id: string;
  test_id: string;
  question_text: string;
  question_type: QuestionType;
  points: number;
  order_index: number;
  created_at: string;
  choices: QuestionChoice[];
}

// Choix de réponse
export interface QuestionChoice {
  id: string;
  question_id: string;
  choice_text: string;
  is_correct: boolean;
  order_index: number;
}

// Statistiques
export interface CoursStats {
  formations: {
    total: number;
    draft: number;
    published: number;
  };
  total_modules: number;
  total_videos: number;
  total_tests: number;
}

// ============================================
// Interfaces pour les inputs API
// ============================================

export interface CreateFormationInput {
  title: string;
  description?: string;
  price?: number;
  duration_hours?: number;
  level?: FormationLevel;
  thumbnail_url?: string;
  status?: FormationStatus;
  passing_score_percentage?: number;
  default_certificate_template_id?: string;
}

export interface UpdateFormationInput {
  title?: string;
  description?: string;
  price?: number;
  duration_hours?: number;
  level?: FormationLevel;
  thumbnail_url?: string;
  status?: FormationStatus;
  passing_score_percentage?: number;
  default_certificate_template_id?: string;
}

export interface CreateModuleInput {
  title: string;
  description?: string;
  order_index?: number;
  prerequisite_module_id?: string;
  module_type: ModuleType;
}

export interface UpdateModuleInput {
  title?: string;
  description?: string;
  order_index?: number;
  prerequisite_module_id?: string;
  module_type?: ModuleType;
}

export interface CreateVideoInput {
  title: string;
  youtube_url: string;
  duration_seconds?: number;
  description?: string;
  order_index?: number;
}

export interface UpdateVideoInput {
  title?: string;
  youtube_url?: string;
  duration_seconds?: number;
  description?: string;
  order_index?: number;
}

export interface CreateTestInput {
  title: string;
  description?: string;
  passing_score?: number;
  time_limit_minutes?: number;
  max_attempts?: number;
  show_correct_answers?: boolean;
}

export interface UpdateTestInput {
  title?: string;
  description?: string;
  passing_score?: number;
  time_limit_minutes?: number;
  max_attempts?: number;
  show_correct_answers?: boolean;
}

export interface CreateQuestionInput {
  question_text: string;
  question_type?: QuestionType;
  points?: number;
  order_index?: number;
}

export interface UpdateQuestionInput {
  question_text?: string;
  question_type?: QuestionType;
  points?: number;
  order_index?: number;
}

export interface CreateChoiceInput {
  choice_text: string;
  is_correct?: boolean;
  order_index?: number;
}

export interface UpdateChoiceInput {
  choice_text?: string;
  is_correct?: boolean;
  order_index?: number;
}

// Interface pour le builder de test complet (création en une seule fois)
export interface CompleteTestInput {
  title: string;
  description?: string;
  passing_score?: number;
  time_limit_minutes?: number;
  max_attempts?: number;
  show_correct_answers?: boolean;
  questions: {
    question_text: string;
    points?: number;
    choices: {
      choice_text: string;
      is_correct: boolean;
    }[];
  }[];
}
