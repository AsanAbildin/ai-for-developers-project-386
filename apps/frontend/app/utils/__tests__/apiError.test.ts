import { describe, expect, it } from 'vitest'
import { ApiError, getApiErrorMessage } from '~/utils/apiError'

describe('ApiError', () => {
  it('использует message и code из тела ответа сервера', () => {
    const error = new ApiError({ code: 'SLOT_UNAVAILABLE', message: 'Slot is taken' }, 409)

    expect(error.code).toBe('SLOT_UNAVAILABLE')
    expect(error.status).toBe(409)
    expect(error.message).toBe('Slot is taken')
  })

  it('использует значения по умолчанию, если тело ответа отсутствует', () => {
    const error = new ApiError(undefined, 500)

    expect(error.code).toBe('UNKNOWN_ERROR')
  })
})

describe('getApiErrorMessage', () => {
  it('возвращает человекочитаемое сообщение для известного кода', () => {
    const error = new ApiError({ code: 'SLOT_UNAVAILABLE', message: 'raw' }, 409)
    expect(getApiErrorMessage(error)).toBe(
      'Этот слот уже занят. Пожалуйста, выберите другое время.'
    )
  })

  it('возвращает message ошибки для неизвестного кода', () => {
    const error = new ApiError({ code: 'WEIRD_CODE', message: 'something odd' }, 400)
    expect(getApiErrorMessage(error)).toBe('something odd')
  })

  it('возвращает message для обычной Error', () => {
    expect(getApiErrorMessage(new Error('boom'))).toBe('boom')
  })

  it('возвращает запасное сообщение для не-Error значений', () => {
    expect(getApiErrorMessage('not an error')).toBe('Неизвестная ошибка')
  })
})
