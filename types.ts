export enum ContentType {
  LESSON_PLAN = 'LESSON_PLAN',
  SLIDE_OUTLINE = 'SLIDE_OUTLINE',
  ASSESSMENT = 'ASSESSMENT',
  VISUAL_AIDS = 'VISUAL_AIDS',
  STUDY_GUIDE = 'STUDY_GUIDE',
  DISCUSSION_BOARD = 'DISCUSSION_BOARD',
}

export interface CourseContext {
  syllabus: string;
  pptMaterials: string;
  examHistory: string;
  courseName: string;
  targetAudience: string;
}

export const INITIAL_CONTEXT: CourseContext = {
  syllabus: '',
  pptMaterials: '',
  examHistory: '',
  courseName: '',
  targetAudience: 'University Students'
};

export interface Module {
  id: string;
  title: string;
  week: number;
  topics: string[];
  content: {
    [key in ContentType]?: string;
  };
}

export interface Project {
  id: string;
  name: string;
  lastModified: number;
  context: CourseContext;
  modules: Module[];
}

export interface CourseData {
  modules: Module[];
}

export interface AIState {
  isGenerating: boolean;
  error: string | null;
}