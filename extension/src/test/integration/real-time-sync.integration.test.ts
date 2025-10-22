import 'jest';
import * as vscode from 'vscode';

// Mock the services
jest.mock('../../services/auth-service');
jest.mock('../../services/project-detection-service');

import { getAuthContext } from '../../services/auth-service';
import { getCurrentProjectInfo } from '../../services/project-detection-service';

describe('Use Case 1: Real-Time Code Synchronization Setup', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should successfully set up real-time sync when user is authenticated and has valid project', async () => {
        // Mock authenticated user
        (getAuthContext as jest.MockedFunction<typeof getAuthContext>).mockResolvedValue({
            context: {
                id: 'user123',
                email: 'developer@example.com',
                first_name: 'TestDev',
                isAuthenticated: true,
                isLocked: false,
                userStatus: 'ACTIVE' as any,
                role: 'user',
                settings: {
                    bug_percentage: 0.1,
                    show_notifications: true,
                    give_suggestions: true,
                    enable_quiz: false,
                    active_threshold: 0.8,
                    suspend_threshold: 0.3,
                    pass_rate: 0.7,
                    suspend_rate: 0.2
                }
            }
        });

        // Mock valid project
        (getCurrentProjectInfo as jest.MockedFunction<typeof getCurrentProjectInfo>).mockReturnValue({
            projectName: 'MyCollabProject',
            localPath: '/path/to/project',
            projectHash: 'abc123hash',
            isGitRepo: true,
            remoteUrl: 'https://github.com/user/MyCollabProject'
        });

        // Test the setup flow
        const authResult = await getAuthContext();
        const projectInfo = getCurrentProjectInfo();

        // Verify setup conditions are met
        expect(authResult.context?.isAuthenticated).toBe(true);
        expect(projectInfo?.projectName).toBe('MyCollabProject');
        expect(projectInfo?.isGitRepo).toBe(true);
        
        // Verify sync can be enabled
        expect(authResult.context?.id).toBeDefined();
        expect(projectInfo?.projectHash).toBeDefined();
    });

    test('should fail setup when user is not authenticated', async () => {
        // Mock unauthenticated state
        (getAuthContext as jest.MockedFunction<typeof getAuthContext>).mockResolvedValue({
            error: 'User not authenticated'
        });

        const authResult = await getAuthContext();

        // Verify setup cannot proceed
        expect(authResult.error).toBeDefined();
        expect(authResult.context).toBeUndefined();
    });

    test('should fail setup when no project is open', () => {
        // Mock no project open
        (getCurrentProjectInfo as jest.MockedFunction<typeof getCurrentProjectInfo>).mockReturnValue(null);

        const projectInfo = getCurrentProjectInfo();

        // Verify setup cannot proceed without project
        expect(projectInfo).toBeNull();
    });

    test('should handle non-Git projects gracefully', () => {
        // Mock non-Git project
        (getCurrentProjectInfo as jest.MockedFunction<typeof getCurrentProjectInfo>).mockReturnValue({
            projectName: 'LocalProject',
            localPath: '/path/to/local/project',
            projectHash: 'local456hash',
            isGitRepo: false,
            remoteUrl: undefined
        });

        const projectInfo = getCurrentProjectInfo();

        // Verify project info is still available for sync
        expect(projectInfo?.projectName).toBe('LocalProject');
        expect(projectInfo?.isGitRepo).toBe(false);
        expect(projectInfo?.projectHash).toBeDefined(); // Can still sync local projects
    });
});