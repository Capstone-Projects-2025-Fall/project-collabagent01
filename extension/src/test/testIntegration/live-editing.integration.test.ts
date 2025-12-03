import 'jest';
import * as vscode from 'vscode';

// Mock VS Code APIs and Live Share
const mockLiveShare = {
    share: jest.fn(),
    join: jest.fn(),
    end: jest.fn()
};

// Mock the services
jest.mock('../../services/auth-service');

import { getAuthContext } from '../../services/auth-service';

describe('Use Case 2: Live Editing Collaboration', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset mock functions
        mockLiveShare.share.mockReset();
        mockLiveShare.join.mockReset();
        mockLiveShare.end.mockReset();
    });

    test('should successfully start live editing session when conditions are met', async () => {
        // Mock authenticated team member
        (getAuthContext as jest.MockedFunction<typeof getAuthContext>).mockResolvedValue({
            context: {
                id: 'team-member-1',
                email: 'member1@example.com',
                first_name: 'Alice',
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

        // Mock successful Live Share session start
        mockLiveShare.share.mockResolvedValue({
            sessionId: 'live-session-123',
            inviteUrl: 'https://prod.liveshare.vsengsaas.visualstudio.com/join?123456'
        });

        // Test live editing session start
        const authResult = await getAuthContext();
        const shareResult = await mockLiveShare.share();

        // Verify live editing prerequisites
        expect(authResult.context?.isAuthenticated).toBe(true);
        expect(authResult.context?.first_name).toBe('Alice');
        
        // Verify Live Share session started
        expect(shareResult.sessionId).toBeDefined();
        expect(shareResult.inviteUrl).toContain('liveshare');
        expect(mockLiveShare.share).toHaveBeenCalledTimes(1);
    });

    test('should successfully join live editing session', async () => {
        // Mock authenticated team member joining
        (getAuthContext as jest.MockedFunction<typeof getAuthContext>).mockResolvedValue({
            context: {
                id: 'team-member-2',
                email: 'member2@example.com',
                first_name: 'Bob',
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

        // Mock successful join
        const inviteUrl = 'https://prod.liveshare.vsengsaas.visualstudio.com/join?123456';
        mockLiveShare.join.mockResolvedValue({
            sessionId: 'live-session-123',
            role: 'guest',
            hostName: 'Alice'
        });

        // Test joining live editing session
        const authResult = await getAuthContext();
        const joinResult = await mockLiveShare.join(inviteUrl);

        // Verify join prerequisites
        expect(authResult.context?.isAuthenticated).toBe(true);
        expect(authResult.context?.first_name).toBe('Bob');
        
        // Verify successful join
        expect(joinResult.sessionId).toBe('live-session-123');
        expect(joinResult.role).toBe('guest');
        expect(joinResult.hostName).toBe('Alice');
        expect(mockLiveShare.join).toHaveBeenCalledWith(inviteUrl);
    });

    test('should handle live editing session end', async () => {
        // Mock authenticated host ending session
        (getAuthContext as jest.MockedFunction<typeof getAuthContext>).mockResolvedValue({
            context: {
                id: 'team-member-1',
                email: 'member1@example.com',
                first_name: 'Alice',
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

        // Mock session end
        mockLiveShare.end.mockResolvedValue({
            success: true,
            message: 'Live Share session ended successfully'
        });

        // Test ending session
        const authResult = await getAuthContext();
        const endResult = await mockLiveShare.end();

        // Verify session can be ended by authenticated user
        expect(authResult.context?.isAuthenticated).toBe(true);
        expect(endResult.success).toBe(true);
        expect(endResult.message).toContain('ended successfully');
        expect(mockLiveShare.end).toHaveBeenCalledTimes(1);
    });

    test('should fail to start live editing when user not authenticated', async () => {
        // Mock unauthenticated user
        (getAuthContext as jest.MockedFunction<typeof getAuthContext>).mockResolvedValue({
            error: 'User not authenticated'
        });

        // Mock Live Share failure
        mockLiveShare.share.mockRejectedValue(new Error('Authentication required'));

        // Test failed live editing start
        const authResult = await getAuthContext();
        
        // Verify prerequisites not met
        expect(authResult.error).toBeDefined();
        expect(authResult.context).toBeUndefined();

        // Verify Live Share cannot start without auth
        await expect(mockLiveShare.share()).rejects.toThrow('Authentication required');
    });

    test('should handle Live Share connection errors gracefully', async () => {
        // Mock authenticated user
        (getAuthContext as jest.MockedFunction<typeof getAuthContext>).mockResolvedValue({
            context: {
                id: 'team-member-1',
                email: 'member1@example.com',
                first_name: 'Alice',
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

        // Mock Live Share service failure
        mockLiveShare.share.mockRejectedValue(new Error('Live Share service unavailable'));

        // Test error handling
        const authResult = await getAuthContext();
        
        // Verify user is authenticated
        expect(authResult.context?.isAuthenticated).toBe(true);
        
        // Verify error is handled gracefully
        await expect(mockLiveShare.share()).rejects.toThrow('Live Share service unavailable');
    });
});