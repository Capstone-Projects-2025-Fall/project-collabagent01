import * as vscode from "vscode";
import {
  convertToSnakeCase,
  escapeHtml,
  getSettings,
  hasBugRandomly,
  getColorCircle,
  hexToHue,
} from "../../utils/index"; // Adjust import path as needed

jest.mock("vscode", () => ({
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string) => {
        const mockSettings: Record<string, any> = {
          "general.vendor": "google",
          "general.modelSelection": "gemini",
          "debug.bugFlag": "true",
        };
        return mockSettings[key];
      }),
    })),
  },
}));

describe("Utility Functions", () => {
  describe("convertToSnakeCase", () => {
    it("should convert camelCase keys to snake_case", () => {
      const input = { userName: "Alice", favoriteColor: "blue" };
      const result = convertToSnakeCase(input);
      expect(result).toEqual({ user_name: "Alice", favorite_color: "blue" });
    });
  });

  describe("escapeHtml", () => {
    it("should escape all special HTML characters", () => {
      const input = `Tom & Jerry's "Cat < Mouse>"`;
      const result = escapeHtml(input);
      expect(result).toBe(
        "Tom &amp; Jerry&#039;s &quot;Cat &lt; Mouse&gt;&quot;"
      );
    });
  });

  describe("getSettings", () => {
    it("should fetch vendor, model, and bug_flag from settings", () => {
      const result = getSettings();
      expect(result).toEqual({
        vendor: "google",
        model: "gemini",
        bug_flag: "true",
      });
    });
  });

  describe("hasBugRandomly", () => {
    it("should return true when Math.random() is below threshold", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.02);
      expect(hasBugRandomly(5)).toBe(true); // 0.02 < 0.05
    });

    it("should return false when Math.random() is above threshold", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      expect(hasBugRandomly(10)).toBe(false); // 0.5 > 0.1
    });
  });

  describe("hexToHue", () => {
    it("should return correct hue for red", () => {
      expect(hexToHue("#ff0000")).toBeCloseTo(0, 1);
    });

    it("should return correct hue for green", () => {
      expect(hexToHue("#00ff00")).toBeCloseTo(120, 1);
    });

    it("should return correct hue for blue", () => {
      expect(hexToHue("#0000ff")).toBeCloseTo(240, 1);
    });
  });

  describe("getColorCircle", () => {
    it("should return correct emoji for various hues", () => {
      expect(getColorCircle("#ff0000")).toBe("🔴 ");
      expect(getColorCircle("#ffa500")).toBe("🟠 ");
      expect(getColorCircle("#ffff00")).toBe("🟡 ");
      expect(getColorCircle("#00ff00")).toBe("🟢 ");
      expect(getColorCircle("#0000ff")).toBe("🔵 ");
      expect(getColorCircle("#800080")).toBe("🟣 ");
      expect(getColorCircle("#808080")).toBe("🔴 ");
    });
  });
});
