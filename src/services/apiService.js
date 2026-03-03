/**
 * API Service Layer
 * 
 * Centralized configuration and instances of all API clients.
 * Handles token injection, error handling, and response interceptors.
 */

import axios from 'axios';
import { Configuration } from '../api-clients/master';
import { InvoiceApi, Configuration as InvoiceMgmtConfiguration } from '../api-clients/invoice-management';
import { Configuration as UserMgmtConfiguration } from '../api-clients/user-management';
import {
    Configuration as ItemMgmtConfiguration,
    ItemApi as ItemBlueprintApi,
    SizeApi,
    InventoryApi,
} from '../api-clients/item-management';
import {
    Configuration as ClientMgmtConfiguration,
    ClientInventoryApi,
} from '../api-clients/client-management';
import {
    CategoryApi,
    ItemApi,
    PartyApi,
} from '../api-clients/master';
import {
    AuthenticationApi,
    UserManagementApi,
} from '../api-clients/user-management';
import config from '../config/config';

/**
 * Get the current access token from localStorage
 */
const getAccessToken = () => {
    return localStorage.getItem(config.ACCESS_TOKEN_KEY);
};

/**
 * Create axios instance with interceptors
 */
const createAxiosInstance = () => {
    const instance = axios.create({
        baseURL: config.API_BASE_URL,
    });

    // Request interceptor - add token to all requests
    instance.interceptors.request.use(
        (config) => {
            const token = getAccessToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Response interceptor - handle errors globally
    instance.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

            // Handle 401 Unauthorized
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;

                // Try to refresh token
                const refreshToken = localStorage.getItem(config.REFRESH_TOKEN_KEY);
                if (refreshToken) {
                    try {
                        const authApi = new AuthenticationApi(
                            new UserMgmtConfiguration({
                                basePath: config.API_BASE_URL,
                            })
                        );

                        const response = await authApi.refreshToken({ refreshToken });
                        const { accessToken, refreshToken: newRefreshToken } = response.data;

                        // Update tokens
                        localStorage.setItem(config.ACCESS_TOKEN_KEY, accessToken);
                        if (newRefreshToken) {
                            localStorage.setItem(config.REFRESH_TOKEN_KEY, newRefreshToken);
                        }

                        // Retry original request with new token
                        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                        return instance(originalRequest);
                    } catch (refreshError) {
                        // Refresh failed - logout user
                        localStorage.removeItem(config.ACCESS_TOKEN_KEY);
                        localStorage.removeItem(config.REFRESH_TOKEN_KEY);
                        localStorage.removeItem(config.USER_KEY);
                        window.location.href = '/login';
                        return Promise.reject(refreshError);
                    }
                } else {
                    // No refresh token - redirect to login
                    localStorage.removeItem(config.ACCESS_TOKEN_KEY);
                    localStorage.removeItem(config.USER_KEY);
                    window.location.href = '/login';
                }
            }

            return Promise.reject(error);
        }
    );

    return instance;
};

// Create shared axios instance
const axiosInstance = createAxiosInstance();

/**
 * Create API configuration with custom axios instance
 */
const createApiConfig = () => {
    return new Configuration({
        basePath: config.API_BASE_URL,
        accessToken: getAccessToken(),
        baseOptions: {
            // Use our custom axios instance
            adapter: axiosInstance.defaults.adapter,
        },
    });
};

const createUserMgmtConfig = () => {
    return new UserMgmtConfiguration({
        basePath: config.API_BASE_URL,
        accessToken: getAccessToken(),
        baseOptions: {
            adapter: axiosInstance.defaults.adapter,
        },
    });
};

const createInvoiceMgmtConfig = () => {
    return new InvoiceMgmtConfiguration({
        basePath: config.API_BASE_URL,
        accessToken: getAccessToken(),
        baseOptions: {
            adapter: axiosInstance.defaults.adapter,
        },
    });
};

const createItemMgmtConfig = () => {
    return new ItemMgmtConfiguration({
        basePath: config.API_BASE_URL,
        accessToken: getAccessToken(),
        baseOptions: {
            adapter: axiosInstance.defaults.adapter,
        },
    });
};

const createClientMgmtConfig = () => {
    return new ClientMgmtConfiguration({
        basePath: config.API_BASE_URL,
        accessToken: getAccessToken(),
        baseOptions: {
            adapter: axiosInstance.defaults.adapter,
        },
    });
};

// Initialize API clients
let partyApi = new PartyApi(createApiConfig(), config.API_BASE_URL, axiosInstance);
let categoryApi = new CategoryApi(createApiConfig(), config.API_BASE_URL, axiosInstance);

let itemApi = new ItemApi(createApiConfig(), config.API_BASE_URL, axiosInstance);
let authApi = new AuthenticationApi(createUserMgmtConfig(), config.API_BASE_URL, axiosInstance);
let userManagementApi = new UserManagementApi(createUserMgmtConfig(), config.API_BASE_URL, axiosInstance);
let invoiceApi = new InvoiceApi(createInvoiceMgmtConfig(), config.API_BASE_URL, axiosInstance);
let exportApi = new InvoiceApi(createInvoiceMgmtConfig(), config.API_BASE_URL, axiosInstance);
let itemBlueprintApi = new ItemBlueprintApi(createItemMgmtConfig(), config.API_BASE_URL, axiosInstance);
let sizeApi = new SizeApi(createItemMgmtConfig(), config.API_BASE_URL, axiosInstance);
let inventoryApi = new InventoryApi(createItemMgmtConfig(), config.API_BASE_URL, axiosInstance);
let clientInventoryApi = new ClientInventoryApi(createClientMgmtConfig(), config.API_BASE_URL, axiosInstance);
/**
 * Update all API clients with new token
 * Call this after login or token refresh
 */
export const updateApiClients = () => {
    const masterConfig = createApiConfig();
    const userConfig = createUserMgmtConfig();

    partyApi = new PartyApi(masterConfig, config.API_BASE_URL, axiosInstance);
    categoryApi = new CategoryApi(masterConfig, config.API_BASE_URL, axiosInstance);

    itemApi = new ItemApi(masterConfig, config.API_BASE_URL, axiosInstance);
    authApi = new AuthenticationApi(userConfig, config.API_BASE_URL, axiosInstance);
    userManagementApi = new UserManagementApi(userConfig, config.API_BASE_URL, axiosInstance);
    invoiceApi = new InvoiceApi(createInvoiceMgmtConfig(), config.API_BASE_URL, axiosInstance);
    exportApi = new InvoiceApi(createInvoiceMgmtConfig(), config.API_BASE_URL, axiosInstance);
    itemBlueprintApi = new ItemBlueprintApi(createItemMgmtConfig(), config.API_BASE_URL, axiosInstance);
    sizeApi = new SizeApi(createItemMgmtConfig(), config.API_BASE_URL, axiosInstance);
    inventoryApi = new InventoryApi(createItemMgmtConfig(), config.API_BASE_URL, axiosInstance);
    clientInventoryApi = new ClientInventoryApi(createClientMgmtConfig(), config.API_BASE_URL, axiosInstance);
};

// Export API clients
export {
    partyApi,
    categoryApi,
    itemApi,
    authApi,
    userManagementApi,
    axiosInstance,
    invoiceApi,
    exportApi,
    itemBlueprintApi,
    sizeApi,
    inventoryApi,
    clientInventoryApi,
};

// Export a default object with all APIs
export default {
    party: partyApi,
    category: categoryApi,
    item: itemApi,
    auth: authApi,
    userManagement: userManagementApi,
    updateClients: updateApiClients,
    invoice: invoiceApi,
    export: exportApi,
    itemBlueprint: itemBlueprintApi,
    size: sizeApi,
    inventory: inventoryApi,
    clientInventory: clientInventoryApi,
};
