const API_BASE = '/api';

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const apiFetch = async <T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = localStorage.getItem('taskgood_token');
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('taskgood_token');
    localStorage.removeItem('taskgood_user');
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new ApiError('Sesión expirada o no autorizada', 401);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || 'Error en la petición';
    const errorCode = data?.code;

    if (response.status === 403 && errorCode === 'FIRST_LOGIN_REQUIRED') {
      window.dispatchEvent(new CustomEvent('auth:first-login-required'));
    }

    throw new ApiError(errorMsg, response.status, errorCode);
  }

  return data as T;
};
