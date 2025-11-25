// API base URL configuration
export const API_URL = "https://3364657fa76d.ngrok-free.app";

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
