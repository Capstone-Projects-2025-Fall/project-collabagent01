// src/test/extension.test.ts
import { activate, deactivate } from "../extension";

// Complete minimal vscode mock
jest.mock("vscode", () => ({
  commands: {
    registerCommand: jest.fn(() => ({ dispose: jest.fn() })),
  },
  window: {
    createStatusBarItem: jest.fn(() => ({
      show: jest.fn(),
      hide: jest.fn(),
    })),
    registerUriHandler: jest.fn(() => ({ dispose: jest.fn() })), // Added this
    showInformationMessage: jest.fn(),
  },
  env: {
    openExternal: jest.fn(),
  },
  Uri: {
    parse: jest.fn(),
  },
  ExtensionContext: jest.fn(),
}));

// Mock external command imports
jest.mock("../commands/auth-commands", () => ({
  uriHandlerCommand: { dispose: jest.fn() },
  signInCommand: { dispose: jest.fn() },
  signOutCommand: { dispose: jest.fn() },
  createAuthStatusBarItem: jest.fn(() => ({ dispose: jest.fn() })),
}));

jest.mock("../commands/test-commands", () => ({
  testFetchCommand: { dispose: jest.fn() },
  fetchSettingsCommand: { dispose: jest.fn() },
  incorrectChoicesCommand: { dispose: jest.fn() },
}));

jest.mock("../commands/suggestion-commands", () => ({
  registerSuggestionCommands: jest.fn(() => [
    { dispose: jest.fn() },
    { dispose: jest.fn() },
    { dispose: jest.fn() },
  ]),
}));

jest.mock("../commands/completion-provider", () => ({
  inlineCompletionProvider: { dispose: jest.fn() },
}));

jest.mock("../services/auth-service", () => ({
  checkUserSignIn: jest.fn(),
}));

jest.mock("../utils/userClass", () => ({
  setupClassStatusBarItem: jest.fn(() => ({ dispose: jest.fn() })),
  registerClassSelectorCommand: jest.fn(),
}));

describe("Extension", () => {
  it("should activate without errors", () => {
    const mockContext = {
      subscriptions: [],
    } as any;

    expect(() => {
      activate(mockContext);
    }).not.toThrow();
  });

  it("should have a deactivate function", () => {
    expect(typeof deactivate).toBe("function");
  });
});
