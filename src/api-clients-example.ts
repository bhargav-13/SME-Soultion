/**
 * Example: Using Generated API Clients
 * 
 * This file demonstrates how to use the auto-generated TypeScript API clients
 * in your application.
 */

import {
    CategoryApi,
    ItemApi,
    PartyApi,
    SubCategoryApi,
    Configuration
} from './api-clients/master';

import {
    AuthenticationApi,
    UserApi,
    Configuration as UserMgmtConfiguration
} from './api-clients/user-management';

// Example 1: Basic API Client Setup
// ----------------------------------

// Create a configuration with your base URL
const masterConfig = new Configuration({
    basePath: 'https://api.example.com', // Replace with your actual API URL
});

// Instantiate API clients
const categoryApi = new CategoryApi(masterConfig);
const itemApi = new ItemApi(masterConfig);
const partyApi = new PartyApi(masterConfig);

// Example 2: Making API Calls
// ---------------------------

async function fetchCategories() {
    try {
        const response = await categoryApi.getAllCategories();
        console.log('Categories:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }
}

async function createItem(itemData) {
    try {
        const response = await itemApi.createItem(itemData);
        console.log('Created item:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating item:', error);
        throw error;
    }
}

// Example 3: With Authentication
// ------------------------------

const userMgmtConfig = new UserMgmtConfiguration({
    basePath: 'https://api.example.com',
    accessToken: 'your-jwt-token-here', // Add your auth token
});

const authApi = new AuthenticationApi(userMgmtConfig);
const userApi = new UserApi(userMgmtConfig);

async function login(username, password) {
    try {
        const response = await authApi.login({ username, password });
        const token = response.data.token;

        // Update configuration with the new token
        userMgmtConfig.accessToken = token;

        return token;
    } catch (error) {
        console.error('Login failed:', error);
        throw error;
    }
}

// Example 4: Using with React/Hooks
// ---------------------------------

import { useState, useEffect } from 'react';

function useCategoriesExample() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const api = new CategoryApi(masterConfig);

        api.getAllCategories()
            .then(response => {
                setCategories(response.data);
                setLoading(false);
            })
            .catch(err => {
                setError(err);
                setLoading(false);
            });
    }, []);

    return { categories, loading, error };
}

// Example 5: Creating a Centralized API Service
// ---------------------------------------------

class ApiService {
    constructor(baseURL, token = null) {
        const config = new Configuration({
            basePath: baseURL,
            accessToken: token,
        });

        // Master APIs
        this.categories = new CategoryApi(config);
        this.items = new ItemApi(config);
        this.parties = new PartyApi(config);
        this.subCategories = new SubCategoryApi(config);

        // User Management APIs
        this.auth = new AuthenticationApi(config);
        this.users = new UserApi(config);
    }

    updateToken(token) {
        // Update token for all API instances
        const config = new Configuration({
            basePath: this.categories.configuration.basePath,
            accessToken: token,
        });

        this.categories = new CategoryApi(config);
        this.items = new ItemApi(config);
        this.parties = new PartyApi(config);
        this.subCategories = new SubCategoryApi(config);
        this.auth = new AuthenticationApi(config);
        this.users = new UserApi(config);
    }
}

// Usage:
const api = new ApiService('https://api.example.com');

// Login and update token
async function authenticateAndFetch() {
    const token = await api.auth.login({ username: 'user', password: 'pass' });
    api.updateToken(token.data.token);

    // Now all API calls will use the authenticated token
    const categories = await api.categories.getAllCategories();
    return categories.data;
}

export { ApiService, categoryApi, itemApi, partyApi, authApi, userApi };
