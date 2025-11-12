/**
 * Backend Configuration
 * Centralized configuration for backend API URL
 */

const LOCAL_BACKEND_URL = "http://localhost:5000";

// TODO: After deploying to Render, replace this with your actual Render URL
// Example: "https://collab-agent-backend.onrender.com"
const PRODUCTION_BACKEND_URL = process.env.BACKEND_URL || "https://project-collabagent01.onrender.com";

// Set to true for local development, false for production
const USE_LOCAL_BACKEND = false;

export const BACKEND_URL = USE_LOCAL_BACKEND ? LOCAL_BACKEND_URL : PRODUCTION_BACKEND_URL;

/**
 * Helper function to get full API endpoint URL
 * @param endpoint - API endpoint path (e.g., "/api/ai/feed")
 * @returns Full URL with backend URL prepended
 */
export function getApiUrl(endpoint: string): string {
    return `${BACKEND_URL}${endpoint}`;
}
