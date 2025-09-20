export interface Suggestion {
  id: string;
  createdAt?: Date | null;
  prompt: string;
  suggestionArray: string[];
  hasBug: boolean;
  vendor?: string;
  model?: string;
  userSectionId?: string;
}

export interface SuggestionContext {
  prompt?: string;
  suggestions?: string[];
  intervenedSuggestions?: IntervenedSuggestion[];
  suggestionId: string;
  hasBug: boolean;
  startTime: number;
}

export interface IntervenedSuggestion {
  mainLine: string;
  fixedLine?: string;
  hasBug: boolean;
}

export interface LineSuggestion {
  id: string;
  mainLine: string;
  fixedLine: string;
  hasBug: boolean;
  lineIndex: number;
  suggestionItems: IntervenedSuggestion[] | null;
}

export interface SuggestionResult {
  suggestions: string[];
  suggestionId: string;
  hasBug: boolean;
}

export interface HintRequest {
  prompt?: string;
  wrongCode: string;
  rightCode: string;
}
