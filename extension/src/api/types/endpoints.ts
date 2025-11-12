// Local backend default port should match Flask app PORT
const LOCAL_ENDPOINT_URL = "http://127.0.0.1:5000";

// Production backend URL - UPDATE THIS after deploying to Render
const PRODUCTION_ENDPOINT_URL = process.env.BACKEND_URL || "https://project-collabagent01.onrender.com";

const TESTING: boolean = false;

const BASE_URL = TESTING ? LOCAL_ENDPOINT_URL : PRODUCTION_ENDPOINT_URL;

const AUTH_ENDPOINT: string = `${BASE_URL}/auth`;

/* Endpoint for creating new AI suggestions */
const AI_SUGGESTION_ENDPOINT = `${BASE_URL}/suggestion`;

const REFINE_PROMPT_ENDPOINT = `${BASE_URL}/suggestion/refine`;

/* Endpoint for creating new AI explanations for incorrect code */
const EXPLANATION_ENDPOINT = `${BASE_URL}/suggestion/explanation`;

const LOG_SUGGESTION_ENDPOINT = `${BASE_URL}/logs/suggestion`;

const LOG_LINE_SUGGESTION_ENDPOINT = `${BASE_URL}/logs/line-suggestion`;

const HINT_ENDPOINT = `${BASE_URL}/suggestion/hint`;

/** Endpoint for logging information */
const LOG_ENDPOINT = `${BASE_URL}/logs`;

/** Endpoint for user information */
const USER_ENDPOINT = `${BASE_URL}/users`;

const ANSWER_ENDPOINT = `${BASE_URL}/suggestion/answer`;

export {
  BASE_URL,
  AUTH_ENDPOINT,
  AI_SUGGESTION_ENDPOINT,
  REFINE_PROMPT_ENDPOINT,
  LOG_SUGGESTION_ENDPOINT,
  LOG_LINE_SUGGESTION_ENDPOINT,
  HINT_ENDPOINT,
  LOG_ENDPOINT,
  USER_ENDPOINT,
  ANSWER_ENDPOINT,
  EXPLANATION_ENDPOINT,
};
