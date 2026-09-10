import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

type RetryConfig = InternalAxiosRequestConfig & { _csrfRetry?: boolean }

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { Accept: 'application/json' },
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
})

export async function ensureCsrf(): Promise<void> {
  await axios.get('/sanctum/csrf-cookie', { withCredentials: true })
}

function isLoginRequest(config?: InternalAxiosRequestConfig): boolean {
  return (config?.url ?? '').includes('/login')
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const original = error.config as RetryConfig | undefined

    if ((status === 401 || status === 419) && original && !original._csrfRetry && !isLoginRequest(original)) {
      original._csrfRetry = true
      try {
        await ensureCsrf()
        return await api.request(original)
      } catch {
        // segue para o redirecionamento
      }
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  },
)
