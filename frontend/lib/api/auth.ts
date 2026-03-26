import { apiClient } from "./client";

export interface LoginCredentials {
  username: string;
  password?: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export const authAPI = {
  login: (credentials: LoginCredentials) =>
    apiClient.post<TokenResponse>("/token/", credentials),
    
  verify: (token: string) =>
    apiClient.post<{}>("/token/verify/", { token }),
    
  refresh: (refresh: string) =>
    apiClient.post<TokenResponse>("/token/refresh/", { refresh }),
};
