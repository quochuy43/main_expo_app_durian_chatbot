// API base URL configuration
export const API_URL = "https://55116568e328.ngrok-free.app";

// API weather
export const WEATHER_API_KEY = '2102014eae2509c5e8870a757be55c97';

// API endpoints
export const API_ENDPOINTS = {
    chat: {
        stream: `${API_URL}/chat/stream`,
    },
    asr: `${API_URL}/asr`,
    auth: {
        register: `${API_URL}/auth/register`,
        login: `${API_URL}/auth/login`,
        me: `${API_URL}/auth/me`,
    },
} as const;
