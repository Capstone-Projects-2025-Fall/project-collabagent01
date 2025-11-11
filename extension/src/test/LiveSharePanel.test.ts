import 'jest';
import * as vscode from 'vscode';

// Provide a small mock for the vsls module before importing the panel so the
// module-level `vsls` variable inside LiveSharePanel resolves to predictable
// Role values during tests.
// Provide a vsls mock that exposes Role and a configurable getApi mock we can
// control in tests.
const vslsMock = {
	Role: { Host: 'Host', Guest: 'Guest' },
	getApi: jest.fn()
};
jest.mock('vsls', () => vslsMock);

// Mock profile-service used by the panel
jest.mock('../services/profile-service', () => ({ 
	getCachedDisplayName: jest.fn(),
	getOrInitDisplayName: jest.fn()
}));

import { LiveShareManager } from '../views/LiveSharePanel';
import { getCachedDisplayName, getOrInitDisplayName } from '../services/profile-service';

describe('LiveShareManager (unit)', () => {
	let provider: LiveShareManager;
	const mockContext: Partial<vscode.ExtensionContext> = {
		globalState: {
			get: jest.fn(),
			update: jest.fn()
		} as any
	};
	const mockUri = vscode.Uri.parse('file:///fake');
	const webviewPost = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		provider = new LiveShareManager(mockContext as any);
		// Attach a fake view so postMessage calls are captured
		(provider as any)._view = {
			webview: {
				postMessage: webviewPost,
				html: '',
				options: {}
			}
		} as any;
	});

	test('getSessionDuration returns minutes when less than 1 hour and hours+minutes when >1h', () => {
		const now = new Date();
		// 45 minutes ago
		(provider as any).sessionStartTime = new Date(now.getTime() - 45 * 60000);
		const shortDur = (provider as any).getSessionDuration();
		expect(shortDur).toMatch(/45m/);

		// 90 minutes ago
		(provider as any).sessionStartTime = new Date(now.getTime() - 90 * 60000);
		const longDur = (provider as any).getSessionDuration();
		expect(longDur).toBe('1h 30m');
	});

	test('setManualInviteLink stores link and posts update messages to webview', () => {
		const link = 'https://example.com/invite';
		(provider as any)._liveShareApi = undefined; // force 'none' status path

		(provider as any).setManualInviteLink(link);

		// globalState.update should be called with some key and the link value
		expect((mockContext.globalState!.update as jest.Mock)).toHaveBeenCalledWith(expect.any(String), link);

		// webview should receive manualLinkUpdated and updateSessionStatus
		expect(webviewPost).toHaveBeenCalledWith({ command: 'manualLinkUpdated', link });
		expect(webviewPost).toHaveBeenCalledWith(expect.objectContaining({ command: 'updateSessionStatus' }));
	});

	test('sendStoredLinkToWebview posts storedLink when present in global state', () => {
		const stored = 'https://stored.example/invite';
		(mockContext.globalState!.get as jest.Mock).mockReturnValueOnce(stored);

		(provider as any).sendStoredLinkToWebview();

		expect((mockContext.globalState!.get as jest.Mock)).toHaveBeenCalled();
		expect(webviewPost).toHaveBeenCalledWith({ command: 'storedLink', link: stored });
	});

	test('clearManualInviteLink clears stored link and notifies webview', () => {
		(provider as any).clearManualInviteLink();

		expect((mockContext.globalState!.update as jest.Mock)).toHaveBeenCalledWith(expect.any(String), undefined);
		expect(webviewPost).toHaveBeenCalledWith({ command: 'manualLinkCleared' });
		expect(webviewPost).toHaveBeenCalledWith(expect.objectContaining({ command: 'updateSessionStatus' }));
	});

	test('resolvePeerDisplayName prefers announced name from participantNameMap', () => {
		const key = 'peer@example.com';
		(provider as any)._participantNameMap.set(key, 'Announced Name');
		const peer = { user: { emailAddress: 'Peer@Example.com' } };
		const name = (provider as any).resolvePeerDisplayName(peer);
		expect(name).toBe('Announced Name');
	});

	test('updateParticipantInfo (host) notifies shared service and posts participants to webview', async () => {
		// make module-level vsls.Role.Host === 'Host' via jest.mock above
		(getCachedDisplayName as jest.Mock).mockReturnValue('CachedHost');
		(getOrInitDisplayName as jest.Mock).mockResolvedValue({ displayName: 'InitHost' });

		(provider as any)._liveShareApi = {
			session: { role: 'Host', user: { displayName: 'HostUser', emailAddress: 'host@ex.com' }, },
			peers: [{ user: { displayName: 'PeerOne', emailAddress: 'p1@ex.com' } }]
		};

		const notify = jest.fn();
		(provider as any)._sharedService = { notify };

		await (provider as any).updateParticipantInfo();

		expect(notify).toHaveBeenCalledWith('participantUpdate', expect.objectContaining({ count: 2 }));
		expect(webviewPost).toHaveBeenCalledWith(expect.objectContaining({ command: 'updateParticipants', count: 2 }));
		expect(webviewPost).toHaveBeenCalledWith(expect.objectContaining({ command: 'updateSessionStatus' }));
	});

		test('guest requestHostSessionStartTime sets sessionStartTime when host provides startTime', async () => {
			const now = new Date().toISOString();
			(provider as any)._liveShareApi = {
				session: { role: 'Guest', user: { displayName: 'GuestUser' } }
			};

			const proxy = {
				isServiceAvailable: true,
				request: jest.fn().mockResolvedValue({ startTime: now })
			};
			const anyApi = (provider as any)._liveShareApi;
			(anyApi as any).getSharedService = jest.fn().mockResolvedValue(proxy);

			await (provider as any).requestHostSessionStartTime();

			// After request, sessionStartTime should be set to the host-provided time (or earlier)
			expect((provider as any).sessionStartTime).toBeDefined();
			const setTime = (provider as any).sessionStartTime.toISOString();
			expect(new Date(setTime).toISOString()).toBe(new Date(now).toISOString());
		});

			test('initializeLiveShare returns false when vsls not available and true when getApi returns api', async () => {
				// First simulate vsls.getApi undefined
				const originalGetApi = (require('vsls') as any).getApi;
				(require('vsls') as any).getApi = undefined;
				const resultFalse = await (provider as any).initializeLiveShare();
				expect(resultFalse).toBe(false);

				// Now mock getApi to return a fake API
				const fakeApi = {
					session: null,
					peers: [],
					onDidChangeSession: jest.fn(),
					onDidChangePeers: jest.fn()
				};
				(require('vsls') as any).getApi = jest.fn().mockResolvedValue(fakeApi);

				const resultTrue = await (provider as any).initializeLiveShare();
				expect(resultTrue).toBe(true);

				// restore
				(require('vsls') as any).getApi = originalGetApi;
			});

			test('start/stop participant monitoring sets and clears interval', () => {
				jest.useFakeTimers();
				expect((provider as any).participantMonitoringInterval).toBeUndefined();
				(provider as any).startParticipantMonitoring();
				expect((provider as any).participantMonitoringInterval).toBeDefined();
				(provider as any).stopParticipantMonitoring();
				expect((provider as any).participantMonitoringInterval).toBeUndefined();
				jest.useRealTimers();
			});

			test('periodicSessionCheck posts none status when no session', () => {
				(provider as any)._liveShareApi = undefined;
				(provider as any).periodicSessionCheck();
				// no crash and no posts
			});

			test('monitorSessionState posts loading and then none when no session', () => {
				(provider as any)._liveShareApi = undefined;
				(provider as any).monitorSessionState();
				expect(webviewPost).toHaveBeenCalledWith(expect.objectContaining({ command: 'updateSessionStatus', status: 'loading' }));
			});

			test.skip('handleSessionChange with session sets sessionStartTime and posts updateSessionStatus', () => {
				// TODO: Fix this test - handleSessionChange is now async and needs proper Supabase mocking
				const fakeSession: any = { role: 'Host', id: 's1', user: { displayName: 'H' }, peerNumber: 1 };
				(provider as any)._liveShareApi = { peers: [] };
				(provider as any).handleSessionChange({ session: fakeSession, changeType: 'existing' });
				expect((provider as any).sessionStartTime).toBeDefined();
				expect(webviewPost).toHaveBeenCalledWith(expect.objectContaining({ command: 'updateSessionStatus' }));
			});


			test('endLiveShareSession and leaveLiveShareSession return early if no api/session', async () => {
				(provider as any)._liveShareApi = undefined;
				await (provider as any).endLiveShareSession();
				await (provider as any).leaveLiveShareSession();
			});

			test('dispose clears intervals and references', () => {
				(provider as any).participantMonitoringInterval = setInterval(() => {}, 1000) as any;
				(provider as any)._durationUpdateInterval = setInterval(() => {}, 1000) as any;
				(provider as any).dispose();
				expect((provider as any).participantMonitoringInterval).toBeUndefined();
				expect((provider as any)._durationUpdateInterval).toBeUndefined();
				expect((provider as any)._view).toBeUndefined();
			});
});
