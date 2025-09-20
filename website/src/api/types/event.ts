export enum LogEvent {
    USER_ACCEPT = "USER_ACCEPT",
    USER_REJECT = "USER_REJECT",
    MODEL_GENERATE = "MODEL_GENERATE",
    MODEL_ERROR = "MODEL_ERROR",

    USER_SIGNUP = "USER_SIGNUP",
    USER_LOGIN = "USER_LOGIN",
    USER_LOGOUT = "USER_LOGOUT",

    USER_AUTH_GITHUB = "USER_AUTH_GITHUB",

    USER_LOCKED = "USER_LOCKED",
    USER_UNLOCKED = "USER_UNLOCKED"
}

export interface Log {
  id: number;
  timestamp: string;
  time_lapse: number;
  event: string;
  metadata: {
    has_bug: boolean;
    suggestion_text: string;
    model: string;
    prompt: string;
  };
}