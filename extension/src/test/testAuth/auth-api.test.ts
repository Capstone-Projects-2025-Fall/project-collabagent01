import 'jest';
import { signIn, signOut, signUp } from '../../api/auth-api';

// Mock fetch globally
global.fetch = jest.fn();

describe('Auth API Unit Tests', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        (fetch as jest.MockedFunction<typeof fetch>).mockClear();
    });

    describe('signIn', () => {
        test('should successfully sign in user with valid credentials', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({
                    data: { token: 'mock-auth-token' }
                })
            };
            
            (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

            const result = await signIn('test@example.com', 'password123');

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/login?provider=email'),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: 'test@example.com',
                        password: 'password123'
                    })
                }
            );
            
            expect(result.token).toBe('mock-auth-token');
            expect(result.error).toBeUndefined();
        });

        test('should handle sign in failure with error message', async () => {
            const mockResponse = {
                ok: false,
                status: 401,
                statusText: 'Unauthorized',
                json: jest.fn().mockResolvedValue({
                    message: 'Invalid credentials'
                })
            };
            
            (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

            const result = await signIn('test@example.com', 'wrongpassword');

            expect(result.error).toBe('Invalid credentials');
            expect(result.token).toBeUndefined();
        });

        test('should handle sign in failure without error message', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: jest.fn().mockResolvedValue({})
            };
            
            (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

            const result = await signIn('test@example.com', 'password123');

            expect(result.error).toBe('Failed to Sign in: 500 Internal Server Error');
            expect(result.token).toBeUndefined();
        });

        test('should handle network error', async () => {
            const networkError = new Error('Network error');
            (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(networkError);

            const result = await signIn('test@example.com', 'password123');

            expect(result.error).toBe('Network error');
            expect(result.token).toBeUndefined();
        });

        test('should handle response without data', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({ data: null })
            };
            
            (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

            const result = await signIn('test@example.com', 'password123');

            expect(result.error).toBeDefined();
            expect(result.token).toBeUndefined();
        });
    });

    describe('signOut', () => {
        test('should successfully sign out user', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({ success: true })
            };
            
            (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

            const result = await signOut('user123');

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/signout'),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: 'user123' })
                }
            );
            
            expect(result.error).toBeUndefined();
        });

        test('should handle sign out failure', async () => {
            const mockResponse = {
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                json: jest.fn().mockResolvedValue({
                    message: 'Invalid user ID'
                })
            };
            
            (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

            const result = await signOut('invalid-user');

            expect(result.error).toBe('Invalid user ID');
        });

        test('should handle sign out failure without error message', async () => {
            const mockResponse = {
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                json: jest.fn().mockResolvedValue({})
            };
            
            (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

            const result = await signOut('user123');

            expect(result.error).toBe('Failed to sign out: 500 Internal Server Error');
        });

        test('should handle network error', async () => {
            const networkError = new Error('Connection timeout');
            (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(networkError);

            const result = await signOut('user123');

            expect(result.error).toBe('Connection timeout');
        });
    });

    describe('signUp', () => {
        test('should successfully sign up new user', async () => {
            const mockResponse = {
                ok: true,
                status: 201,
                json: jest.fn().mockResolvedValue({
                    data: { token: 'new-user-token' }
                })
            };
            
            (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

            const result = await signUp('newuser@example.com', 'password123', 'John', 'Doe');

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/signup'),
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: 'newuser@example.com',
                        password: 'password123',
                        first_name: 'John',
                        last_name: 'Doe'
                    })
                }
            );
            
            expect(result.token).toBe('new-user-token');
            expect(result.error).toBeUndefined();
        });

        test('should handle sign up failure with error message', async () => {
            const mockResponse = {
                ok: false,
                status: 409,
                statusText: 'Conflict',
                json: jest.fn().mockResolvedValue({
                    error: 'Email already exists'
                })
            };
            
            (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

            const result = await signUp('existing@example.com', 'password123', 'Jane', 'Smith');

            expect(result.error).toBe('Email already exists');
            expect(result.token).toBeUndefined();
        });

        test('should handle sign up failure without data', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({ data: null })
            };
            
            (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

            const result = await signUp('test@example.com', 'password123', 'Test', 'User');

            expect(result.error).toBe('Failed to sign up');
            expect(result.token).toBeUndefined();
        });

        test('should handle network error', async () => {
            const networkError = new Error('DNS resolution failed');
            (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(networkError);

            const result = await signUp('test@example.com', 'password123', 'Test', 'User');

            expect(result.error).toBe('DNS resolution failed');
            expect(result.token).toBeUndefined();
        });

        test('should handle response with invalid status but no data', async () => {
            const mockResponse = {
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                json: jest.fn().mockResolvedValue({ data: null })
            };
            
            (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

            const result = await signUp('invalid-email', 'short', '', '');

            expect(result.error).toBe('Failed to sign up');
            expect(result.token).toBeUndefined();
        });

        test('should handle JSON parsing error', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
            };
            
            (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

            const result = await signUp('test@example.com', 'password123', 'Test', 'User');

            expect(result.error).toBe('Invalid JSON');
            expect(result.token).toBeUndefined();
        });
    });

    describe('Edge cases and error handling', () => {
        test('should handle empty response body', async () => {
            const mockResponse = {
                ok: true,
                status: 200,
                json: jest.fn().mockResolvedValue({})
            };
            
            (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue(mockResponse as any);

            const result = await signIn('test@example.com', 'password123');

            expect(result.error).toBeDefined();
            expect(result.token).toBeUndefined();
        });

        test('should handle unexpected error types', async () => {
            (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue('String error');

            const result = await signIn('test@example.com', 'password123');

            expect(result.error).toBe('Unknown error occurred');
        });

        test('should handle null values gracefully', async () => {
            (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(null);

            const result = await signOut('user123');

            expect(result.error).toBe('Unknown error occurred');
        });
    });
});