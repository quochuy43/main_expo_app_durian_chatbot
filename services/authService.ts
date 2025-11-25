import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '@/constants/config';

const TOKEN_KEY = '@durian_auth_token';

export interface RegisterData {
    email: string;
    full_name: string;
    password: string;
}

export interface LoginData {
    email: string;
    password: string;
}

export interface User {
    id: string;
    email: string;
    full_name: string;
    created_at: string;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
}

export const AuthService = {
    /**
     * Register a new user
     */
    async register(data: RegisterData): Promise<AuthResponse> {
        try {
            console.log('Registering with:', API_ENDPOINTS.auth.register);

            const response = await fetch(API_ENDPOINTS.auth.register, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                },
                body: JSON.stringify(data),
            });

            console.log('Register response status:', response.status);

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response:', text.substring(0, 200));
                throw new Error(`Backend error: Server returned ${response.status} - ${response.statusText}. Please check if the backend is running correctly.`);
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Registration failed');
            }

            const result = await response.json();
            console.log('Register success:', result);

            // Store token
            await this.storeToken(result.access_token);

            return result;
        } catch (error) {
            console.error('Registration error:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Network error during registration');
        }
    },

    /**
     * Login user
     */
    async login(data: LoginData): Promise<AuthResponse> {
        try {
            console.log('Logging in with:', API_ENDPOINTS.auth.login);

            const response = await fetch(API_ENDPOINTS.auth.login, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true',
                },
                body: JSON.stringify(data),
            });

            console.log('Login response status:', response.status);

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response:', text.substring(0, 200));
                throw new Error(`Backend error: Server returned ${response.status} - ${response.statusText}. Please check if the backend is running correctly.`);
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Login failed');
            }

            const result = await response.json();
            console.log('Login success');

            // Store token
            await this.storeToken(result.access_token);

            return result;
        } catch (error) {
            console.error('Login error:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Network error during login');
        }
    },

    /**
     * Get current user information
     */
    async getCurrentUser(token?: string): Promise<User> {
        try {
            const authToken = token || await this.getToken();

            if (!authToken) {
                throw new Error('No authentication token');
            }

            const response = await fetch(API_ENDPOINTS.auth.me, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'ngrok-skip-browser-warning': 'true',
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to get user info');
            }

            return await response.json();
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Network error getting user info');
        }
    },

    /**
     * Store authentication token
     */
    async storeToken(token: string): Promise<void> {
        try {
            await AsyncStorage.setItem(TOKEN_KEY, token);
        } catch (error) {
            console.error('Error storing token:', error);
            throw new Error('Failed to store authentication token');
        }
    },

    /**
     * Get stored authentication token
     */
    async getToken(): Promise<string | null> {
        try {
            return await AsyncStorage.getItem(TOKEN_KEY);
        } catch (error) {
            console.error('Error getting token:', error);
            return null;
        }
    },

    /**
     * Remove authentication token (logout)
     */
    async removeToken(): Promise<void> {
        try {
            await AsyncStorage.removeItem(TOKEN_KEY);
        } catch (error) {
            console.error('Error removing token:', error);
            throw new Error('Failed to remove authentication token');
        }
    },
};
