import * as vscode from "vscode";
import {
  getSelectedClass,
  registerClassSelectorCommand,
  setupClassStatusBarItem,
} from "../../utils/userClass";
import { getAuthContext } from "../../services/auth-service";
import { getUserClasses } from "../../api/user-api";
import { UserClass } from "../../api/types/user";

// Store command callbacks
const mockCommandCallbacks: Record<string, (...args: any[]) => any> = {};

// Mocks
jest.mock("vscode", () => {
  const actualVscode = jest.requireActual("vscode");

  return {
    ...actualVscode,
    commands: {
      registerCommand: jest.fn(
        (command: string, callback: (...args: any[]) => any) => {
          mockCommandCallbacks[command] = callback;
          return { dispose: jest.fn() };
        }
      ),
    },
    window: {
      showErrorMessage: jest.fn(),
      showInformationMessage: jest.fn(),
      showQuickPick: jest.fn(),
      createStatusBarItem: jest.fn(() => ({
        show: jest.fn(),
        text: "",
        color: "",
        tooltip: "",
        command: "",
      })),
    },
    env: {
      openExternal: jest.fn(),
    },
    Uri: {
      parse: jest.fn((url) => url),
    },
  };
});

jest.mock("../../services/auth-service", () => ({
  getAuthContext: jest.fn(),
}));

jest.mock("../../api/user-api", () => ({
  getUserClasses: jest.fn(),
}));

jest.mock("../../utils", () => ({
  getColorCircle: jest.fn(() => "🟢"),
}));

describe("userClass utilities", () => {
  const context: any = { subscriptions: [] };
  let mockStatusBar: vscode.StatusBarItem;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStatusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      1
    );
  });

  describe("getSelectedClass", () => {
    it("should return null initially", () => {
      expect(getSelectedClass()).toBeNull();
    });
  });

  describe("setupClassStatusBarItem", () => {
    it("should create and return a status bar item", async () => {
      const bar = await setupClassStatusBarItem();
      expect(bar).toBeDefined();
      expect(bar.command).toBe("your-extension.selectClass");
      expect(bar.show).toHaveBeenCalled();
    });
  });

  describe("registerClassSelectorCommand", () => {
    const user = { id: "user123" };

    it("should show error if auth fails", async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({
        context: undefined,
        error: "Unauthorized",
      });

      await registerClassSelectorCommand(context, mockStatusBar);
      await mockCommandCallbacks["your-extension.selectClass"]();

      expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
        "Failed to get user context: Unauthorized"
      );
    });

    it("should show register modal if no classes", async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({ context: user });
      (getUserClasses as jest.Mock).mockResolvedValue({
        data: [],
        error: "No classes found",
      });

      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(
        undefined
      );

      await registerClassSelectorCommand(context, mockStatusBar);
      await mockCommandCallbacks["your-extension.selectClass"]();

      expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
        "You have no registered classes. Would you like to register one now?",
        { modal: true },
        "Open CLOVER"
      );
      expect(mockStatusBar.text).toBe("📘 SELECT CLASS ⌄");
    });

    it("should open CLOVER if user agrees", async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({ context: user });
      (getUserClasses as jest.Mock).mockResolvedValue({
        data: [],
        error: "No classes found",
      });

      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(
        "Open CLOVER"
      );

      await registerClassSelectorCommand(context, mockStatusBar);
      await mockCommandCallbacks["your-extension.selectClass"]();

      expect(vscode.env.openExternal).toHaveBeenCalledWith(
        "https://clover.nickrucinski.com/"
      );
    });

    it("should select a class from quick pick", async () => {
      const classes: UserClass[] = [
        {
          id: "1",
          instructorId: "instructor1",
          classTitle: "AI 101",
          classCode: "A101",
          classHexColor: "#00ff00",
        },
      ];

      (getAuthContext as jest.Mock).mockResolvedValue({ context: user });
      (getUserClasses as jest.Mock).mockResolvedValue({ data: classes });

      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
        label: "🟢 AI 101",
        originalTitle: "AI 101",
      });

      await registerClassSelectorCommand(context, mockStatusBar);
      await mockCommandCallbacks["your-extension.selectClass"]();

      expect(mockStatusBar.text).toContain("CLASS: AI 101");
      expect(mockStatusBar.color).toBe("#00ff00");
    });

    it("should handle 'No class' option in quick pick", async () => {
      const classes: UserClass[] = [
        {
          id: "1",
          instructorId: "instructor1",
          classTitle: "AI 101",
          classCode: "A101",
          classHexColor: "#00ff00",
        },
      ];

      (getAuthContext as jest.Mock).mockResolvedValue({ context: user });
      (getUserClasses as jest.Mock).mockResolvedValue({ data: classes });

      (vscode.window.showQuickPick as jest.Mock).mockResolvedValue({
        label: "🚫 No class",
      });

      await registerClassSelectorCommand(context, mockStatusBar);
      await mockCommandCallbacks["your-extension.selectClass"]();

      expect(mockStatusBar.text).toBe("📘 SELECT CLASS ⌄");
    });
  });
});
