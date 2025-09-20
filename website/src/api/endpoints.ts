/** Gets the endpoint from the .env if it is available otherwise it uses localhost */
export const BASE_ENDPOINT =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8001";
/* Endpoint for creating new AI suggestions */
export const AI_SUGGESTION_ENDPOINT: string = `${BASE_ENDPOINT}/suggestion`;

/* Endpoint for saving AI suggestions */
export const LOG_SUGGESTION_ENDPOINT: string = `${BASE_ENDPOINT}/logs/suggestion`;

export const USER_ENDPOINT: string = `${BASE_ENDPOINT}/users`;

/** Endpoint for logging information */
export const LOG_ENDPOINT: string = `${BASE_ENDPOINT}/logs`;

export const AUTH_ENDPOINT: string = `${BASE_ENDPOINT}/auth`;

export const CLASS_ENDPOINT: string = `${BASE_ENDPOINT}/classes`;
