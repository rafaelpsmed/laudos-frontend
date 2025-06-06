import axios from 'axios';
import { ACCESS_TOKEN, REFRESH_TOKEN } from './constants';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
console.log('API URL:', API_URL); // Log para debug

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Interceptor para adicionar o token em todas as requisições
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(ACCESS_TOKEN);
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        console.log('Request config:', config); // Log para debug
        return config;
    },
    (error) => {
        console.error('Request error:', error); // Log para debug
        return Promise.reject(error);
    }
);

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
    (response) => {
        console.log('Response:', response); // Log para debug
        return response;
    },
    async (error) => {
        console.error('Response error:', error); // Log para debug
        const originalRequest = error.config;

        // Se o erro for 401 e não for uma tentativa de refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem(REFRESH_TOKEN);
                if (!refreshToken) {
                    throw new Error('Refresh token não encontrado');
                }

                // Tenta obter um novo token
                const response = await axios.post(
                    `${API_URL}/api/auth/refresh/`,
                    { refresh: refreshToken }
                );

                const { access } = response.data;
                localStorage.setItem(ACCESS_TOKEN, access);
                api.defaults.headers.common['Authorization'] = `Bearer ${access}`;
                originalRequest.headers['Authorization'] = `Bearer ${access}`;

                return api(originalRequest);
            } catch (refreshError) {
                console.error('Erro ao atualizar token:', refreshError);
                localStorage.removeItem(ACCESS_TOKEN);
                localStorage.removeItem(REFRESH_TOKEN);
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
