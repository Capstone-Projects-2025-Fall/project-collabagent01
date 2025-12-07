import * as vscode from 'vscode';
import * as fs from 'fs';
import { ProfilePanel } from '../../views/ProfilePanel';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

jest.mock('vscode', () => {
  return {
    Uri: {
      joinPath: jest.fn((_base: any, ..._segments: string[]) => ({
        fsPath: '/mock/profilePanel.html',
        toString: () => 'vscode-resource:/profile.css',
      })),
      file: (p: string) => ({ fsPath: p }),
    },
  };
});

describe('ProfilePanel', () => {
  const readFileSyncMock = fs.readFileSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns HTML with injected style URI when template loads', async () => {
    readFileSyncMock.mockReturnValue(
      '<html><head><link href="{{PROFILE_STYLE_URI}}"></head></html>'
    );

    const webview = {
      asWebviewUri: jest.fn((_uri: any) => ({
        toString: () => 'style-uri',
      })),
    } as any;

    const panel = new ProfilePanel(vscode.Uri.file('/ext'), {} as any);
    const html = await panel.getHtml(webview);

    expect(readFileSyncMock).toHaveBeenCalledWith(
      '/mock/profilePanel.html',
      'utf8'
    );
    expect(html).toContain('style-uri');
    expect(html).not.toContain('{{PROFILE_STYLE_URI}}');
  });

  it('returns fallback HTML when template fails to load', async () => {
    readFileSyncMock.mockImplementation(() => {
      throw new Error('File not found');
    });

    const webview = {
      asWebviewUri: jest.fn((_uri: any) => ({
        toString: () => 'style-uri',
      })),
    } as any;

    const panel = new ProfilePanel(vscode.Uri.file('/ext'), {} as any);
    const html = await panel.getHtml(webview);

    expect(html).toBe('<div>Failed to load profile panel.</div>');
  });
});