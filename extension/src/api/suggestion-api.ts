// Stubbed: Clover suggestion API removed.
export async function fetchSuggestions(..._args: any[]) { return { suggestions: [] }; }
export async function refinePrompt(..._args: any[]) { return { refinedPrompt: undefined, error: 'disabled' }; }
export async function saveSuggestionToDatabase(..._args: any[]) { return { status: 200, success: true, data: '' }; }
export async function updateSuggestionInDatabase(..._args: any[]) { return { status: 200, success: true }; }
export async function logLineSuggestionToDatabase(..._args: any[]) { return { status: 200, success: true, data: '' }; }
export async function getHint(..._args: any[]) { return { status: 200, success: false, error: 'disabled' }; }
export async function getExplanation(..._args: any[]) { return { status: 200, success: false, error: 'disabled' }; }
export async function submitCode(..._args: any[]) { return false; }
export function resetIntervenedCache() { /* no-op */ }
export async function fetchIntervenedSuggestions(..._args: any[]) { return { suggestion: undefined, error: 'disabled' }; }
