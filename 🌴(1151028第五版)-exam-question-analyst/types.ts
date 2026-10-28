export interface Distractor {
  option: string;
  reason: string;
}

export interface ErrorCause {
  title: string;
  summary: string;
}

export interface TeachingSuggestion {
  title: string;
  points: string[];
}

export interface AnalysisResult {
  abilityAssessment: string;
  distractors: Distractor[];
  errorCauses: ErrorCause[];
  teachingSuggestions: TeachingSuggestion[];
}

export interface InputData {
  type: 'image' | 'text';
  content: string;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface ModelOption {
  id: string;
  name: string;
  tag: string;
  description: string;
  isRecommended?: boolean;
}

export interface GeminiConfig {
  apiKey: string;
  model: string;
}