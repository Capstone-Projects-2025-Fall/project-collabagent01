// Stubbed: Clover suggestion engine removed. This file intentionally exports
// no-op placeholders to satisfy any residual imports without retaining logic.

export type SuggestionChoice = { text: string; isCorrect: boolean; index: number };
export const currentChoices: SuggestionChoice[] = [];
export const suggestionContext: any = {};
export const isSuspended = false;
export const resetSuggestionContext = () => {};
export const resetDebounceTimeout = () => {};
export const setDebounceTimeout = (..._args: any[]) => {};
export const setLastRequest = (..._args: any[]) => {};
export async function handleSuggestionRequest(..._args: any[]) { return; }
export async function buildIntervenedCompletionItems(..._args: any[]) { return []; }
export async function buildCompletionItems(..._args: any[]) { return []; }
export async function handleBuggedSuggestionReview(..._args: any[]) { return; }
export async function handleIncorrectSuggestionSelection(..._args: any[]) { return; }
