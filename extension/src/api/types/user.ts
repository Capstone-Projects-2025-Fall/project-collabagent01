export enum UserStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  LOCKED = "LOCKED",
}

export enum UserSectionStatus {
  ACTIVE = "ACTIVE",
  NEED_REVIEW = "NEED_REVIEW",
  COMPLETE = "COMPLETE",
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
  userStatus: UserStatus;
  role: string;
  settings: UserSettings;
}

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
  intervened?: boolean;
};

export interface UserClass {
  id: string;
  classTitle: string;
  classCode: string;
  instructorId: string;
  classHexColor?: string;
  classImageCover?: string;
  createdAt?: string;
}

export const AUTH_CONTEXT = "authContext";
