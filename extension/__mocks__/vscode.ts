// Jest environment declarations for TypeScript
declare const jest: any;
declare const module: any;

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
  Position: jest.fn((line: any, character: any) => new Position(line, character)),
  Range: jest.fn((startLine: any, startCharacter: any, endLine: any, endCharacter: any) => {
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
    showInputBox: jest.fn(),
    showQuickPick: jest.fn(),
    withProgress: jest.fn(),
    createOutputChannel: jest.fn(),
    registerUriHandler: jest.fn(),
    registerWebviewViewProvider: jest.fn(() => ({ dispose: jest.fn() })),
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
  env: {
    openExternal: jest.fn(),
  },
  StatusBarAlignment: { Left: 1, Right: 2 },
  ProgressLocation: { 
    Notification: 15, 
    SourceControl: 1, 
    Window: 10 
  },
  ThemeColor: jest.fn((themeColor: any) => ({ themeColor })),
  languages: {
    registerInlineCompletionItemProvider: jest.fn(() => ({ dispose: jest.fn() })),
  },
  workspace: {
    getConfiguration: jest.fn(),
    onDidChangeTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
  },
  Uri: {
    parse: jest.fn((value: string) => ({
      toString: () => value,
      fsPath: value,
      path: value,
      scheme: value.split(":")[0] || "",
    })),
    file: jest.fn((path: string) => ({
      toString: () => `file://${path}`,
      fsPath: path,
      path: path,
      scheme: "file",
    })),
    joinPath: jest.fn((base: any, ...pathSegments: string[]) => ({
      toString: () => `${base.toString()}/${pathSegments.join('/')}`,
      fsPath: `${base.fsPath}/${pathSegments.join('/')}`,
      path: `${base.path}/${pathSegments.join('/')}`,
      scheme: base.scheme || "",
    })),
  },
  ExtensionContext: jest.fn(),
  // Add other VS Code APIs you use
};

module.exports = vscode;
