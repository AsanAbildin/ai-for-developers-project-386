import { ApiError, type ApiErrorBody } from '~/utils/apiError'

interface OpenApiFetchResult<T> {
  data?: T
  error?: ApiErrorBody
  response: Response
}

/**
 * Разворачивает результат вызова openapi-fetch: возвращает `data` при успехе
 * или бросает {@link ApiError} с телом ошибки сервера при неуспешном статусе.
 */
export function unwrapApi<T>(result: OpenApiFetchResult<T>): T {
  if (result.error !== undefined || !result.response.ok) {
    throw new ApiError(result.error, result.response.status)
  }
  return result.data as T
}
