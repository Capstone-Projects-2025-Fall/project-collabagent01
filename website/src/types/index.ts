export enum EnrollmentStatus {
  WAITLISTED = "WAITLISTED",
  ENROLLED = "ENROLLED",
  COMPLETED = "COMPLETED",
  REMOVED = "REMOVED",
  REJECTED = "REJECTED",
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

export interface UserActivityLogItem {
  id: number;
  event: string;
  timestamp: string;
  timeLapse: number;
  metadata: {
    userId?: string;
    hasBug?: boolean;
    suggestionId?: number;
    userSectionId?: string;
    userClassId?: string;
  };
}


