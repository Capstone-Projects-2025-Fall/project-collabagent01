import * as vscode from 'vscode';
import { showLoginWebview } from '../../views/webview';
let createdPanel: any;

jest.mock('vscode', () => {
  const showInformationMessage = jest.fn();
  const showErrorMessage = jest.fn();

  const createWebviewPanel = jest.fn(
    (_viewType: string, _title: string, _column: number, _options: any) => {
      const handlers: any[] = [];

      const panel = {
        webview: {
          html: '',
          onDidReceiveMessage: (
            cb: (msg: any) => any,
            _thisArg?: any,
            disposables?: any[]
          ) => {
            handlers.push(cb);
            if (disposables) {
              disposables.push({ dispose: jest.fn() });
            }
          },
        },
        dispose: jest.fn(),
        _messageHandlers: handlers,
      };

      createdPanel = panel;
      return panel;
    }
  );

  return {
    window: {
      createWebviewPanel,
      showInformationMessage,
      showErrorMessage,
    },
    ViewColumn: { One: 1 },
  };
});

describe('showLoginWebview', () => {
  beforeEach(() => {
    createdPanel = undefined;
    jest.clearAllMocks();
  });

  it('creates a webview panel and sets HTML content', () => {
    const context = {
      globalState: { update: jest.fn() },
      subscriptions: [],
    } as any;

    showLoginWebview(context);

    expect(vscode.window.createWebviewPanel).toHaveBeenCalled();
    expect(createdPanel.webview.html).toContain('<!DOCTYPE html>');
  });

  it('handles auth-success message and stores session', async () => {
    const context = {
      globalState: { update: jest.fn(), get: jest.fn() },
      subscriptions: [],
    } as any;

    showLoginWebview(context);

    const handler = createdPanel._messageHandlers[0];

    await handler({
      type: 'auth-success',
      data: { email: 'test@example.com' },
    });

    expect(context.globalState.update).toHaveBeenCalledWith(
      'supabaseSession',
      { email: 'test@example.com' }
    );
    expect(vscode.window.showInformationMessage).toHaveBeenCalledWith(
      'Logged in as test@example.com!'
    );
    expect(createdPanel.dispose).toHaveBeenCalled();
  });

  it('handles auth-error message', async () => {
    const context = {
      globalState: { update: jest.fn(), get: jest.fn() },
      subscriptions: [],
    } as any;

    showLoginWebview(context);

    const handler = createdPanel._messageHandlers[0];

    await handler({
      type: 'auth-error',
      error: 'Bad credentials',
    });

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Login failed: Bad credentials'
    );
  });
});