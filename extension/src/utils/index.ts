import vscode from "vscode";

/**
 * Converts the keys of an object from camelCase to snake_case.
 *
 * @param obj - The input object with camelCase keys.
 * @returns A new object with snake_case keys and the same values.
 */
export const convertToSnakeCase = (
  obj: Record<string, any>
): Record<string, any> => {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [
      key.replace(/([A-Z])/g, "_$1").toLowerCase(), // Convert camelCase to snake_case
      value,
    ])
  );
};
/**
 * Escapes special HTML characters in a string to prevent XSS attacks.
 *
 * Replaces characters such as &, <, >, ", and ' with their HTML-escaped equivalents.
 *
 * @param text - The text to escape.
 * @returns The escaped version of the input text.
 */
export const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/**
 * Retrieves the AI model configuration settings from the VS Code workspace.
 *
 * Fetches vendor, model selection, and debug flags from the "collabAgent" extension settings.
 *
 * @returns An object containing `vendor`, `model`, and `bug_flag` values.
 */
export function getSettings() {
  const vendor = vscode.workspace
    .getConfiguration("collabAgent")
    .get<string>("general.vendor");
  const model = vscode.workspace
    .getConfiguration("collabAgent")
    .get<string>("general.modelSelection");
  const bug_flag = vscode.workspace
    .getConfiguration("collabAgent")
    .get<string>("debug.bugFlag");

  return { vendor, model, bug_flag };
}

/**
 * Randomly determines whether a bug should be injected, based on a percentage threshold.
 *
 * @param bugThreshold - The probability threshold (0–100) for introducing a bug.
 * @returns `true` if a bug should be injected; otherwise, `false`.
 */
export const hasBugRandomly = (bugThreshold: number): boolean =>
  Math.random() < bugThreshold * 0.01;

/**
 * Returns a colored circle emoji based on a given hex color code.
 *
 * Maps different hue ranges to corresponding color emojis (🔴🟠🟡🟢🔵🟣⚫).
 *
 * @param hex - A hexadecimal color code (e.g., "#FF5733").
 * @returns A string containing a single emoji representing the color.
 */
export const getColorCircle = (hex: string): string => {
  const hue = hexToHue(hex);
  if (hue < 15) {
    return "🔴 ";
  }
  if (hue < 45) {
    return "🟠 ";
  }
  if (hue < 75) {
    return "🟡 ";
  }
  if (hue < 165) {
    return "🟢 ";
  }
  if (hue < 265) {
    return "🔵 ";
  }
  if (hue < 345) {
    return "🟣 ";
  }
  return "⚫ ";
};

/**
 * Converts a hexadecimal color code to its corresponding hue value.
 *
 * Calculates the hue (0–360 degrees) of the color based on its RGB components.
 *
 * @param hex - A hexadecimal color code (e.g., "#FF5733").
 * @returns The hue value as a number between 0 and 360.
 */
export function hexToHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / (max - min);
        break;
      case g:
        h = 2 + (b - r) / (max - min);
        break;
      case b:
        h = 4 + (r - g) / (max - min);
        break;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }
  return h;
}
