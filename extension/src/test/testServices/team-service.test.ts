import * as teamService from '../../services/team-service';
import { Team } from '../../services/team-service';

// ----------------------
// VSCode + Service Mocks
// ----------------------
jest.mock('vscode');
jest.mock('../../auth/supabaseClient', () => ({
  getSupabase: jest.fn(),
}));
jest.mock('../../services/auth-service', () => ({
  getAuthContext: jest.fn(),
}));
jest.mock('../../services/project-detection-service', () => ({
  getCurrentProjectInfo: jest.fn(),
  validateCurrentProject: jest.fn(),
  getProjectDescription: jest.fn(),
}));
jest.mock('../../services/github-verification-service', () => ({
  verifyGitHubPushAccess: jest.fn(),
  isGitHubRepository: jest.fn(),
  promptGitHubVerification: jest.fn(),
}));
jest.mock('../../services/team-activity-service', () => ({
  insertParticipantStatusEvent: jest.fn(),
}));

import { getSupabase } from '../../auth/supabaseClient';
import { getAuthContext } from '../../services/auth-service';
import {
  getCurrentProjectInfo,
  validateCurrentProject,
} from '../../services/project-detection-service';
import {
  verifyGitHubPushAccess,
  isGitHubRepository,
} from '../../services/github-verification-service';
import { insertParticipantStatusEvent } from '../../services/team-activity-service';

// manual VSCode mock
// eslint-disable-next-line @typescript-eslint/no-var-requires
const vscode = require('vscode');

// -----------------------------
// Supabase mock base definition
// -----------------------------
const mockSupabase: any = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  rpc: jest.fn(),
};

// --------------------------------------
// FROM() factory with complete chain ops
//---------------------------------------
function createFromChain(overrides = {}) {
  const chain: any = {};

  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.is = jest.fn(() => chain);

  chain.single = jest.fn(() => Promise.resolve({ data: null, error: null }));
  chain.maybeSingle = jest.fn(() => Promise.resolve({ data: null, error: null }));
  chain.in = jest.fn(() => Promise.resolve({ data: null, error: null }));

  chain.order = jest.fn(() =>
    Promise.resolve({ data: [], error: null })
  );

  chain.update = jest.fn(() => ({
    eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
  }));

  chain.delete = jest.fn(() => ({
    eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
  }));

  return Object.assign(chain, overrides);
}

// --------------------------------------
// RPC mock factory (supports .single())
// --------------------------------------
function createRpcResponse(data: any, error: any = null) {
  return {
    single: jest.fn(() => Promise.resolve({ data, error })),
    maybeSingle: jest.fn(() => Promise.resolve({ data, error })),
    data,
    error,
  };
}

// Attach main mock
(getSupabase as jest.Mock).mockReturnValue(mockSupabase);

// ----------------------
// TEST SUITE BEGINS
// ----------------------
describe('team-service (hybrid coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.auth.getUser.mockReset();
    mockSupabase.from.mockReset();
    mockSupabase.rpc.mockReset();
  });

  // ----------------------
  // Helper mock generators
  // ----------------------
  const mockAuthedUserContext = () => {
    (getAuthContext as jest.Mock).mockResolvedValue({
      context: {
        id: 'user-1',
        email: 'test@example.com',
        isAuthenticated: true,
      },
    });
  };

  const mockCurrentGitProject = () => {
    (getCurrentProjectInfo as jest.Mock).mockReturnValue({
      projectName: 'My Project',
      projectHash: 'hash-123',
      isGitRepo: true,
      remoteUrl: 'https://github.com/owner/repo',
      localPath: '/path/to/project',
    });
  };

  // ------------------------------------------------
  // CREATE TEAM RPC MOCK (with .single/.maybeSingle)
  // ------------------------------------------------
  mockSupabase.rpc.mockImplementation((fnName: string, args?: any) => {
    switch (fnName) {
      case "create_team":
        return Promise.resolve({
          data: {
            id: "team-1",
            lobby_name: "My Lobby",
            join_code: "ABC123",
            project_identifier: "hash-123",
            project_repo_url: "https://github.com/owner/repo",
            project_name: "My Project",
          },
          error: null,
        });

      case "get_team_by_join_code":
        return Promise.resolve({
          data: {
            id: "team-1",
            lobby_name: "Team A",
            project_identifier: "hash-123",
            project_repo_url: "https://github.com/owner/repo",
          },
          error: null,
        });

      case "join_team_by_code":
        return Promise.resolve({ data: null, error: null });

      case "leave_team":
        return Promise.resolve({ data: true, error: null });

      default:
        return Promise.resolve({ data: null, error: { message: "RPC not found" } });
    }
  });

  // -----------------------
  // createTeam tests
  // -----------------------
  describe('createTeam', () => {
    test('returns error when user is not authenticated', async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({
        context: undefined,
        error: 'no context',
      });

      const result = await teamService.createTeam('My Lobby');
      expect(result.error).toContain('User must be authenticated');
      expect(result.team).toBeUndefined();
    });

    test('returns error when no workspace is open', async () => {
      mockAuthedUserContext();
      (getCurrentProjectInfo as jest.Mock).mockReturnValue(null);

      const result = await teamService.createTeam('My Lobby');
      expect(result.error).toContain('No workspace folder is open');
    });

    test('returns error when project is not a git repo with remote', async () => {
      mockAuthedUserContext();
      (getCurrentProjectInfo as jest.Mock).mockReturnValue({
        projectName: 'Local Only',
        projectHash: 'hash',
        isGitRepo: false,
        remoteUrl: null,
      });

      const result = await teamService.createTeam('My Lobby');
      expect(result.error).toContain('Team functionality requires a Git repository');
    });
  });

  // -----------------------
  // joinTeam
  // -----------------------
  describe('joinTeam', () => {
    test('requires authentication', async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({
        context: undefined,
        error: 'no ctx',
      });

      const result = await teamService.joinTeam('ABC123');
      expect(result.error).toContain('User must be authenticated');
    });

    test('requires workspace folder', async () => {
      mockAuthedUserContext();
      (getCurrentProjectInfo as jest.Mock).mockReturnValue(null);

      const result = await teamService.joinTeam('ABC123');
      expect(result.error).toContain('No workspace folder is open');
    });

    test('returns project mismatch error when validateCurrentProject fails', async () => {
      mockAuthedUserContext();
      mockCurrentGitProject();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      });

      mockSupabase.rpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_team_by_join_code') {
          return createRpcResponse({
            id: 'team-1',
            lobby_name: 'Team A',
            project_identifier: 'team-hash',
            project_repo_url: 'https://github.com/org/team-repo',
          });
        }
        return createRpcResponse(null, null);
      });

      (validateCurrentProject as jest.Mock).mockReturnValue({
        isMatch: false,
        currentProject: { remoteUrl: 'https://github.com/owner/repo' },
        reason: 'Repository URLs do not match',
      });

      mockSupabase.from.mockImplementation(() => createFromChain({
        maybeSingle: jest.fn(() =>
          Promise.resolve({ data: null, error: null })
        ),
      }));

      const result = await teamService.joinTeam('ABC123');
      expect(result.error).toContain('Project mismatch');
      expect(result.error).toContain('Repository URLs do not match');
    });

    test('successfully joins a team and emits participant status event', async () => {
      mockAuthedUserContext();
      mockCurrentGitProject();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      });

      mockSupabase.rpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_team_by_join_code') {
          return createRpcResponse({
            id: 'team-1',
            lobby_name: 'Team A',
            project_identifier: 'hash-123',
            project_repo_url: 'https://github.com/owner/repo',
          });
        }
        if (fnName === 'join_team_by_code') {
          return createRpcResponse(null, null);
        }
        return createRpcResponse(null, null);
      });

      (validateCurrentProject as jest.Mock).mockReturnValue({
        isMatch: true,
        currentProject: { remoteUrl: 'https://github.com/owner/repo' },
        reason: 'match',
      });

      mockSupabase.from.mockImplementation(() => createFromChain({
        maybeSingle: jest.fn(() =>
          Promise.resolve({ data: null, error: null })
        ),
      }));

      (insertParticipantStatusEvent as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result = await teamService.joinTeam('ABC123');

      expect(result.error).toBeUndefined();
      expect(result.team?.id).toBe('team-1');
      expect(insertParticipantStatusEvent).toHaveBeenCalledWith(
        'team-1',
        'auth-user-id',
        ['auth-user-id'],
        []
      );
    });
  });

  // -----------------------
  // getUserTeams
  // -----------------------
  describe('getUserTeams', () => {
    test('requires authentication', async () => {
      (getAuthContext as jest.Mock).mockResolvedValue({
        context: undefined,
        error: 'no ctx',
      });

      const result = await teamService.getUserTeams();
      expect(result.error).toContain('User must be authenticated');
    });

    test('returns teams from membership', async () => {
      mockAuthedUserContext();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'team_membership') {
          return createFromChain({
            select: jest.fn(() => ({
              eq: jest.fn(() =>
                Promise.resolve({
                  data: [
                    {
                      role: 'admin',
                      teams: {
                        id: 'team-1',
                        lobby_name: 'Team A',
                        created_by: 'auth-user-id',
                        join_code: 'ABC123',
                        created_at: '2024-01-01',
                        project_identifier: 'hash',
                        project_repo_url: 'url',
                        project_name: 'Proj',
                      },
                    },
                  ],
                  error: null,
                })
              ),
            })),
          });
        }
        return {};
      });

      const result = await teamService.getUserTeams();
      expect(result.error).toBeUndefined();
      expect(result.teams).toHaveLength(1);
      expect(result.teams?.[0].role).toBe('admin');
      expect(result.teams?.[0].id).toBe('team-1');
    });
  });

  // -----------------------
  // getTeamById
  // -----------------------
  describe('getTeamById', () => {
    test('returns team when membership exists', async () => {
      mockAuthedUserContext();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'team_membership') {
          return createFromChain({
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  single: jest.fn(() =>
                    Promise.resolve({
                      data: {
                        role: 'member',
                        teams: {
                          id: 'team-1',
                          lobby_name: 'Team A',
                          created_by: 'owner',
                          join_code: 'ABC123',
                          created_at: '2024-01-01',
                        },
                      },
                      error: null,
                    })
                  ),
                })),
              })),
            })),
          });
        }
        return {};
      });

      const result = await teamService.getTeamById('team-1');
      expect(result.error).toBeUndefined();
      expect(result.team?.id).toBe('team-1');
      expect(result.team?.role).toBe('member');
    });
  });
  

  // -----------------------
  // handleProjectMismatch
  // -----------------------
  describe('handleProjectMismatch', () => {
    const sampleTeam: Team = {
      id: 'team-1',
      lobby_name: 'Team A',
      created_by: 'owner',
      join_code: 'ABC123',
      created_at: '2024-01-01',
      project_identifier: 'hash-123',
      project_repo_url: 'https://github.com/owner/repo',
      project_name: 'Proj',
    };

    const sampleProject = {
      projectName: 'Other Project',
      localPath: '/other',
      projectHash: 'other-hash',
      isGitRepo: true,
      remoteUrl: 'https://github.com/other/repo',
    };

    test('returns "continue" when user chooses Continue Anyway', async () => {
      (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(
        'Continue Anyway'
      );

      const action = await teamService.handleProjectMismatch(
        sampleTeam,
        sampleProject as any
      );
      expect(action).toBe('continue');
    });

    test('returns "switch" when user chooses Switch to Team Project', async () => {
      (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(
        'Switch to Team Project'
      );

      const action = await teamService.handleProjectMismatch(
        sampleTeam,
        sampleProject as any
      );
      expect(action).toBe('switch');
    });

    test('returns "cancel" on cancel/undefined', async () => {
      (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);

      const action = await teamService.handleProjectMismatch(
        sampleTeam,
        sampleProject as any
      );
      expect(action).toBe('cancel');
    });
  });

  // -----------------------
  // openTeamProject
  // -----------------------
  describe('openTeamProject', () => {
    test('offers to clone repo when project_repo_url is present', async () => {
      const team: Team = {
        id: 'team-1',
        lobby_name: 'Team A',
        created_by: 'owner',
        join_code: 'ABC123',
        created_at: '2024-01-01',
        project_identifier: 'hash',
        project_repo_url: 'https://github.com/owner/repo',
        project_name: 'Proj',
      };

      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue(
        'Clone Repository'
      );

      const result = await teamService.openTeamProject(team);
      expect(result.success).toBe(true);
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'git.clone',
        'https://github.com/owner/repo'
      );
    });

    test('shows info message when project is local-only', async () => {
      const team: Team = {
        id: 'team-1',
        lobby_name: 'Team A',
        created_by: 'owner',
        join_code: 'ABC123',
        created_at: '2024-01-01',
        project_identifier: 'hash',
        project_name: 'LocalOnly',
      };

      (vscode.window.showInformationMessage as jest.Mock).mockResolvedValue('OK');

      const result = await teamService.openTeamProject(team);
      expect(result.success).toBe(false);
      expect(vscode.window.showInformationMessage).toHaveBeenCalled();
    });
  });

  // -----------------------
  // leaveTeam
  // -----------------------
  describe('leaveTeam', () => {
    test('prevents admin from leaving team', async () => {
      mockAuthedUserContext();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      });

      mockSupabase.from.mockImplementation(() =>
        createFromChain({
          maybeSingle: jest.fn(() =>
            Promise.resolve({
              data: { role: 'admin' },
              error: null,
            })
          ),
        })
      );

      const result = await teamService.leaveTeam('team-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Team admins cannot leave');
    });

    test('successfully leaves team as member and emits status event', async () => {
      mockAuthedUserContext();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      });

      mockSupabase.from.mockImplementation(() =>
        createFromChain({
          maybeSingle: jest.fn(() =>
            Promise.resolve({
              data: { role: 'member' },
              error: null,
            })
          ),
        })
      );

      mockSupabase.rpc.mockImplementation((fnName: string) => {
        if (fnName === 'leave_team') {
          return createRpcResponse(true, null);
        }
        return createRpcResponse(null, null);
      });

      (insertParticipantStatusEvent as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result = await teamService.leaveTeam('team-1');
      expect(result.success).toBe(true);
      expect(insertParticipantStatusEvent).toHaveBeenCalledWith(
        'team-1',
        'auth-user-id',
        [],
        ['auth-user-id']
      );
    });
  });

  // -----------------------
  // getTeamMembers
  // -----------------------
  describe('getTeamMembers', () => {
    test('uses RPC when available', async () => {
      mockAuthedUserContext();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'team_membership') {
          return createFromChain({
            maybeSingle: jest.fn(() =>
              Promise.resolve({
                data: { id: 'membership-1' },
                error: null,
              })
            ),
          });
        }

        if (table === 'user_profiles') {
          return createFromChain({
            in: jest.fn(() => Promise.resolve({ data: [], error: null })),
          });
        }

        return {};
      });

      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            membership_id: 'm-1',
            user_id: 'u-1',
            role: 'member',
            joined_at: '2024-01-01',
            email: 'user1@example.com',
            display_name: 'User One',
            full_name: 'User One',
          },
        ],
        error: null,
      });

      const result = await teamService.getTeamMembers('team-1');
      expect(result.error).toBeUndefined();
      expect(result.members).toHaveLength(1);
      expect(result.members?.[0].email).toBe('user1@example.com');
      expect(result.members?.[0].displayName).toBe('User One');
    });
  });
});
