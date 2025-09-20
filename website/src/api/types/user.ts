export enum UserRole {
  ADMIN = "ADMIN",
  INSTRUCTOR = "INSTRUCTOR",
  STUDENT = "STUDENT",
  DEV = "DEVELOPER",
}

export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
  auth_token?: string;
  code_context_id?: string;
  isAuthenticated: boolean;
  isLocked: boolean;
}

export interface UserData {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
  status?: string;
  role: UserRole;
  settings: UserSettings;
  last_updated_at?: string;
  auth_created_at?: string;
  last_sign_in?: string;
  source?: string;
  avatar_url?: string;
}

export const AUTH_CONTEXT = "authContext";

export type SettingsData = {
  user_id: string;
  settings: UserSettings;
};

export type UserSettings = {
  bug_percentage: number;
  show_notifications: boolean;
  give_suggestions: boolean;
  // enable_cooldown: boolean;
  // cooldown_time: number;
  enable_quiz: boolean;
  active_threshold: number;
  suspend_threshold: number;
  pass_rate: number;
  suspend_rate: number;
};

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

export interface UserClass {
  id?: string;
  classTitle: string;
  classCode: string;
  instructorId?: string;
  classHexColor?: string;
  classImageCover?: string | null;
  classDescription?: string | null;
  createdAt?: string;
}

export enum StudentStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  LOCKED = "LOCKED",
}

export interface ClassData {
  id?: string;
  classTitle: string;
  classCode: string;
  instructorId?: string;
  classHexColor?: string;
  classImageCover?: string | null;
  classDescription?: string | null;
  createdAt?: string;
  students: UserData[];
}
