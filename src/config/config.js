/**
 * Application Configuration
 * 
 * Centralized configuration for the application.
 * Environment variables can be set in .env file.
 */

export const config = {
    // API Base URL - defaults to localhost if not set in environment
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',

    // Token storage keys
    ACCESS_TOKEN_KEY: 'access_token',
    REFRESH_TOKEN_KEY: 'refresh_token',
    USER_KEY: 'user_data',

    // API endpoints
    API_ENDPOINTS: {
        AUTH: {
            SIGNIN: '/api/v1/auth/signin',
            REFRESH: '/api/v1/auth/refresh',
        },
        USERS: {
            BASE: '/api/v1/users',
            REGISTER: '/api/v1/users/register',
        },
    },
};

export default config;
