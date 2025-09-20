class Position {
  constructor(public line: number, public character: number) {}
}

class CustomRange {
  constructor(public start: Position, public end: Position) {}
}

export class InlineCompletionItem {
  constructor(public insertText: string) {}
}

// __mocks__/vscode.ts
const vscode = {
  Position: jest.fn((line, character) => new Position(line, character)),
  Range: jest.fn((startLine, startCharacter, endLine, endCharacter) => {
    return new CustomRange(
      new Position(startLine, startCharacter),
      new Position(endLine, endCharacter)
    );
  }),
  InlineCompletionItem,
  commands: {
    registerCommand: jest.fn(),
    executeCommand: jest.fn(),
  },
  window: {
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    createOutputChannel: jest.fn(),
    registerUriHandler: jest.fn(),
    createStatusBarItem: jest.fn(() => ({
      show: jest.fn(),
      hide: jest.fn(),
      text: "",
      tooltip: "",
      command: "",
      backgroundColor: undefined,
      name: "",
      alignment: 1,
    })),
  },
  StatusBarAlignment: { Left: 1, Right: 2 },
  ThemeColor: jest.fn(function (themeColor) {
    this.themeColor = themeColor;
  }),
  languages: {
    registerInlineCompletionItemProvider: jest.fn(() => ({
      dispose: jest.fn(),
    })),
  },
  workspace: {
    getConfiguration: jest.fn(),
  },
  Uri: {
    parse: jest.fn(),
  },
  ExtensionContext: jest.fn(),
  // Add other VS Code APIs you use
};

module.exports = vscode;
