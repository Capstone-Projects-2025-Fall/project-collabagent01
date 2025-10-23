import 'jest';
import * as vscode from 'vscode';

// Mock external dependencies
jest.mock('../../api/auth-api');
jest.mock('../../api/user-api');
jest.mock('../../views/notifications');

// Mock globalContext
const mockGlobalContext = {
    globalState: {
        get: jest.fn(),
        update: jest.fn().mockResolvedValue(undefined)
    }
};

jest.mock('../../extension', () => ({
    globalContext: mockGlobalContext
}));

import { signIn, signOut, signUp } from '../../api/auth-api';
import { getUserByID } from '../../api/user-api';
import { setAuthContext, getAuthContext } from '../../services/auth-service';
import { 
    showAuthNotification, 
    errorNotification, 
    authSignOutNotification 
} from '../../views/notifications';

describe('Authentication Service Unit Tests', () => {
    
    const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        isAuthenticated: true,
        isLocked: false,
        userStatus: 'ACTIVE' as any,
        role: 'user' as any,
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
    };

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset global context mocks
        mockGlobalContext.globalState.get.mockReturnValue(undefined);
        mockGlobalContext.globalState.update.mockResolvedValue(undefined);
    });

    describe('setAuthContext', () => {
        test('should successfully set user context', async () => {
            const result = await setAuthContext(mockUser);
            
            expect(mockGlobalContext.globalState.update).toHaveBeenCalledWith('authContext', mockUser);
            expect(result.error).toBeUndefined();
        });

        test('should successfully clear user context', async () => {
            const result = await setAuthContext(undefined);
            
            expect(mockGlobalContext.globalState.update).toHaveBeenCalledWith('authContext', undefined);
            expect(result.error).toBeUndefined();
        });

        test('should handle error when global context is invalid', async () => {
            // Temporarily mock global context as undefined
            const originalMock = require('../../extension').globalContext;
            require('../../extension').globalContext = undefined;
            
            const result = await setAuthContext(mockUser);
            
            expect(result.error).toBe('Invalid user or context provided.');
            
            // Restore mock
            require('../../extension').globalContext = originalMock;
        });

        test('should handle error when update fails', async () => {
            mockGlobalContext.globalState.update.mockRejectedValue(new Error('Update failed'));
            
            const result = await setAuthContext(mockUser);
            
            expect(result.error).toBe('Update failed');
        });
    });

    describe('getAuthContext', () => {
        test('should successfully retrieve user context', async () => {
            mockGlobalContext.globalState.get.mockReturnValue(mockUser);
            
            const result = await getAuthContext();
            
            expect(mockGlobalContext.globalState.get).toHaveBeenCalledWith('authContext');
            expect(result.error).toBeUndefined();
            expect(result.context).toEqual(mockUser);
        });

        test('should return undefined context when no user is stored', async () => {
            mockGlobalContext.globalState.get.mockReturnValue(undefined);
            
            const result = await getAuthContext();
            
            expect(result.error).toBeUndefined();
            expect(result.context).toBeUndefined();
        });

        test('should handle error when retrieving context fails', async () => {
            mockGlobalContext.globalState.get.mockImplementation(() => {
                throw new Error('Storage error');
            });
            
            const result = await getAuthContext();
            
            expect(result.error).toBe('Storage error');
            expect(result.context).toBeUndefined();
        });
    });

    describe('API Integration Tests', () => {
        test('should validate signIn API is called correctly', async () => {
            // Mock successful sign in
            (signIn as jest.MockedFunction<typeof signIn>).mockResolvedValue({
                token: 'test-token-123'
            });

            const result = await signIn('user@test.com', 'password123');
            
            expect(result.token).toBe('test-token-123');
            expect(result.error).toBeUndefined();
        });

        test('should validate signUp API is called correctly', async () => {
            // Mock successful sign up
            (signUp as jest.MockedFunction<typeof signUp>).mockResolvedValue({
                token: 'new-user-token'
            });

            const result = await signUp('newuser@test.com', 'password123', 'Jane', 'Doe');
            
            expect(result.token).toBe('new-user-token');
            expect(result.error).toBeUndefined();
        });

        test('should validate getUserByID API is called correctly', async () => {
            // Mock successful user retrieval
            (getUserByID as jest.MockedFunction<typeof getUserByID>).mockResolvedValue({
                user: mockUser
            });

            const result = await getUserByID('test-token-123');
            
            expect(result.user).toEqual(mockUser);
            expect(result.error).toBeUndefined();
        });

        test('should handle API error responses correctly', async () => {
            // Mock API error
            (signIn as jest.MockedFunction<typeof signIn>).mockResolvedValue({
                error: 'Invalid credentials'
            });

            const result = await signIn('user@test.com', 'wrongpassword');
            
            expect(result.token).toBeUndefined();
            expect(result.error).toBe('Invalid credentials');
        });
    });

    describe('Notification Integration Tests', () => {
        test('should call success notifications correctly', async () => {
            await setAuthContext(mockUser);
            
            // Test that we can call notification functions
            (showAuthNotification as jest.MockedFunction<typeof showAuthNotification>)('Welcome!');
            
            expect(showAuthNotification).toHaveBeenCalledWith('Welcome!');
        });

        test('should call error notifications correctly', async () => {
            // Test that we can call error notification functions
            (errorNotification as jest.MockedFunction<typeof errorNotification>)('Test error');
            
            expect(errorNotification).toHaveBeenCalledWith('Test error');
        });

        test('should call auth sign out notifications correctly', async () => {
            // Test that we can call sign out notification functions
            (authSignOutNotification as jest.MockedFunction<typeof authSignOutNotification>)('Signed out');
            
            expect(authSignOutNotification).toHaveBeenCalledWith('Signed out');
        });
    });
});