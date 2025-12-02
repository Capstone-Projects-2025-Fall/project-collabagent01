import * as teamService from '../../services/team-service';
import { Team } from '../../services/team-service';

// Mocks
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

// Use the manual vscode mock from __mocks__/vscode.ts
// eslint-disable-next-line @typescript-eslint/no-var-requires
const vscode = require('vscode');

const mockSupabase: any = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(),
  rpc: jest.fn(),
};

(getSupabase as jest.Mock).mockReturnValue(mockSupabase);

describe('team-service (hybrid coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase.auth.getUser.mockReset();
    mockSupabase.from.mockReset();
    mockSupabase.rpc.mockReset();
  });

  // Helpers
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

  // -----------------------
  // createTeam
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

    test('successfully creates a verified team when GitHub verification passes', async () => {
      mockAuthedUserContext();
      mockCurrentGitProject();

      (isGitHubRepository as jest.Mock).mockReturnValue(true);
      (verifyGitHubPushAccess as jest.Mock).mockResolvedValue({
        hasAccess: true,
        permission: 'admin',
        repoInfo: { repoId: 123 },
      });

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      });

      mockSupabase.rpc.mockImplementation((fnName: string) => {
        if (fnName === 'create_team') {
          return Promise.resolve({
            data: {
              id: 'team-1',
              lobby_name: 'My Lobby',
              join_code: 'ABC123',
              project_identifier: 'hash-123',
              project_repo_url: 'https://github.com/owner/repo',
              project_name: 'My Project',
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'teams') {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      });

      const result = await teamService.createTeam('My Lobby');

      expect(result.error).toBeUndefined();
      expect(result.team?.id).toBe('team-1');
      expect(result.joinCode).toBe('ABC123');
      expect(verifyGitHubPushAccess).toHaveBeenCalledWith(
        'https://github.com/owner/repo'
      );
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_team', expect.any(Object));
    });

    test('handles duplicate team name error from RPC', async () => {
      mockAuthedUserContext();
      mockCurrentGitProject();

      (isGitHubRepository as jest.Mock).mockReturnValue(false);

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      });

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'DUPLICATE_TEAM_NAME' },
      });

      const result = await teamService.createTeam('Existing Team');
      expect(result.error).toContain('A team with this name already exists');
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

      // team lookup via rpc
      mockSupabase.rpc.mockImplementation((fnName: string) => {
        if (fnName === 'get_team_by_join_code') {
          return Promise.resolve({
            data: {
              id: 'team-1',
              lobby_name: 'Team A',
              project_identifier: 'team-hash',
              project_repo_url: 'https://github.com/org/team-repo',
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });

      (validateCurrentProject as jest.Mock).mockReturnValue({
        isMatch: false,
        currentProject: { remoteUrl: 'https://github.com/owner/repo' },
        reason: 'Repository URLs do not match',
      });

      // membership check: not yet a member
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'team_membership') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      const result = await teamService.joinTeam('ABC123');
      expect(result.error).toContain('Project mismatch');
      expect(result.error).toContain('Repository URLs do not match');
      expect(mockSupabase.rpc).not.toHaveBeenCalledWith('join_team_by_code', expect.anything());
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
          return Promise.resolve({
            data: {
              id: 'team-1',
              lobby_name: 'Team A',
              project_identifier: 'hash-123',
              project_repo_url: 'https://github.com/owner/repo',
            },
            error: null,
          });
        }
        if (fnName === 'join_team_by_code') {
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      (validateCurrentProject as jest.Mock).mockReturnValue({
        isMatch: true,
        currentProject: { remoteUrl: 'https://github.com/owner/repo' },
        reason: 'match',
      });

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'team_membership') {
          // existing membership check
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      (insertParticipantStatusEvent as jest.Mock).mockResolvedValue({ success: true });

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
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
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
              }),
            }),
          };
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
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
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
                  }),
                }),
              }),
            }),
          };
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
  // validateTeamProject
  // -----------------------
  describe('validateTeamProject', () => {
    test('returns match state and validation message', async () => {
      const team: Team = {
        id: 'team-1',
        lobby_name: 'Team A',
        created_by: 'owner',
        join_code: 'ABC123',
        created_at: '2024-01-01',
        project_identifier: 'hash-123',
        project_repo_url: 'https://github.com/owner/repo',
        project_name: 'Proj',
      };

      jest
        .spyOn(teamService, 'getTeamById')
        .mockResolvedValue({ team: { ...team, role: 'admin' }, error: undefined });

      mockCurrentGitProject();
      (validateCurrentProject as jest.Mock).mockReturnValue({
        isMatch: true,
        currentProject: { remoteUrl: 'https://github.com/owner/repo' },
        reason: 'Matches',
      });

      const result = await teamService.validateTeamProject('team-1');
      expect(result.isValid).toBe(true);
      expect(result.team?.id).toBe('team-1');
      expect(result.validationMessage).toBe('Matches');
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

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'team_membership') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { role: 'admin' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

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

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'team_membership') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { role: 'member' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      mockSupabase.rpc.mockImplementation((fnName: string) => {
        if (fnName === 'leave_team') {
          return Promise.resolve({ data: true, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      (insertParticipantStatusEvent as jest.Mock).mockResolvedValue({ success: true });

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
  // getTeamMembers (RPC + fallback)
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
          // membership check for current user
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  maybeSingle: jest.fn().mockResolvedValue({
                    data: { id: 'membership-1' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          };
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

    test('falls back when RPC fails and maps profiles', async () => {
      mockAuthedUserContext();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-user-id' } },
        error: null,
      });

      // membership check for current user
      const membershipSelect = {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { id: 'membership-self' },
                error: null,
              }),
            }),
          }),
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'team_membership') {
          // For user membership check or members listing (both use from('team_membership'))
          return {
            ...membershipSelect,
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [
                  {
                    id: 'm-1',
                    user_id: 'u-1',
                    role: 'member',
                    joined_at: '2024-01-01',
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'user_profiles') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    user_id: 'u-1',
                    name: 'Profile Name',
                    interests: ['TS', 'Node'],
                    custom_skills: ['VSCode'],
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC not found' },
      });

      const result = await teamService.getTeamMembers('team-1');
      expect(result.error).toBeUndefined();
      expect(result.members).toHaveLength(1);
      const member = result.members![0];
      expect(member.displayName).toBe('Profile Name');
      expect(member.skills).toEqual(['TS', 'Node', 'VSCode']);
    });
  });
});
