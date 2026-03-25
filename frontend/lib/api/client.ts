/**
 * Base API Client
 * Handles all HTTP requests to the Django backend
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    // Ensure baseUrl ends with / and endpoint starts with /
    const baseUrlWithSlash = this.baseUrl.endsWith("/")
      ? this.baseUrl
      : `${this.baseUrl}/`;
    const endpointWithSlash = endpoint.startsWith("/")
      ? endpoint.substring(1)
      : endpoint;

    const fullUrl = `${baseUrlWithSlash}${endpointWithSlash}`;
    const url = new URL(fullUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    // TODO: Add authentication token to headers when auth is implemented
    // const token = localStorage.getItem("authToken");
    // if (token) {
    //   headers["Authorization"] = `Bearer ${token}`;
    // }

    return headers;
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const response = await fetch(url, {
      method: "GET",
      headers: this.getHeaders(),
    });

    return this.handleResponse<T>(response);
  }

  async post<T>(
    endpoint: string,
    data?: any,
    params?: Record<string, any>,
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const response = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async put<T>(
    endpoint: string,
    data?: any,
    params?: Record<string, any>,
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const response = await fetch(url, {
      method: "PUT",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async patch<T>(
    endpoint: string,
    data?: any,
    params?: Record<string, any>,
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const response = await fetch(url, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  async postForm<T>(
    endpoint: string,
    formData: FormData,
    params?: Record<string, any>,
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const headers: HeadersInit = {};
    // No Content-Type header -- browser sets multipart boundary automatically
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    return this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = this.buildUrl(endpoint, params);
    const response = await fetch(url, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    // DELETE often returns 204 No Content (empty response)
    if (response.status === 204) {
      return null as T;
    }

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    // Handle empty responses (e.g., 204 No Content)
    if (response.status === 204) {
      return null as T;
    }

    // Try to parse JSON response
    let data: any;
    try {
      data = await response.json();
    } catch {
      // If response is not JSON, throw error
      throw new APIError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
      );
    }

    // Check for HTTP errors
    if (!response.ok) {
      throw new APIError(
        data.detail ||
          data.message ||
          `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        data,
      );
    }

    return data as T;
  }
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any,
  ) {
    super(message);
    this.name = "APIError";
  }
}

export const apiClient = new APIClient();
