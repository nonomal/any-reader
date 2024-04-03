import axios from 'axios';
import { BASE_URL } from '@/constants';

const service = axios.create({
  withCredentials: false,
  baseURL: BASE_URL,
  timeout: 15000
});

service.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

service.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);
export default service;
