import axios from 'axios';
import type { Facility, KosProfile } from './types';

const api = axios.create({ baseURL: '/' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 pada login berarti password salah, bukan sesi habis
    if (error.response?.status === 401 && !error.config?.url?.includes('/api/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const kosQuery = {
  queryKey: ['kos'],
  queryFn: () => api.get<KosProfile>('/api/kos').then((res) => res.data),
  staleTime: 60_000,
};

export const facilitiesQuery = {
  queryKey: ['facilities'],
  queryFn: () => api.get<Facility[]>('/api/facilities').then((res) => res.data),
  staleTime: 60_000,
};

export default api;
