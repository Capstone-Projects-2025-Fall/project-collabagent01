export interface Suggestion {
    id: string;
    createdAt?: Date | null;
    prompt: string;
    suggestionText: string;
    hasBug: boolean;
    vendor?: string;
    model?: string;
}

export interface CodeSuggestion {
  id: number;
  createdAt: string;
  hasBug: boolean;
  suggestionArray: string[];
  timeLapse?: number;
  model: string;
  prompt?: string;
  accepted?: boolean;
}

export interface AISuggestion {
  hasBug: boolean;
  suggestionText: string;
  id: string;
  created_at: string;
  model: string;
  prompt: string;
  timeLapsed?: number;
  accepted?: boolean;
}

export interface SuggestionResult {
    suggestions: string[];
    suggestionId: string; 
    hasBug: boolean;   
};

export interface AIStats {
    id: string;
    created_at: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    model: string;
    latency_seconds: number;
    provider: string;
};

export type ProgressData = {
  suggestions: AISuggestion[];
  progress: {
    totalAccepted: number;
    totalWithBugs: number;
    percentageWithBugs: number;
  };
};