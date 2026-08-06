import type { components } from '~/types/api'

export type ApiErrorBody = components['schemas']['ApiError']

/**
 * Ошибка API с телом ответа сервера ({ code, message }), если оно было получено.
 * Используется для единообразной обработки ошибок во всех composables.
 */
export class ApiError extends Error {
  code: string
  status?: number

  constructor(body: ApiErrorBody | undefined, status?: number) {
    super(body?.message ?? 'Неизвестная ошибка API')
    this.name = 'ApiError'
    this.code = body?.code ?? 'UNKNOWN_ERROR'
    this.status = status
  }
}

/** Человекочитаемые сообщения для известных кодов ошибок из контракта API. */
const KNOWN_ERROR_MESSAGES: Record<string, string> = {
  SLOT_UNAVAILABLE: 'Этот слот уже занят. Пожалуйста, выберите другое время.',
  OUT_OF_WINDOW: 'Выбранное время вне доступного окна записи (14 дней).',
  ALREADY_CANCELLED: 'Это бронирование уже отменено.',
  INVALID_CANCELLATION_TOKEN: 'Неверный токен отмены бронирования.',
  NOT_FOUND: 'Запись не найдена.'
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return KNOWN_ERROR_MESSAGES[error.code] ?? error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Неизвестная ошибка'
}
