import { describe, expect, it } from 'vitest'
import { pageCount, paginate } from '~/utils/paginate'

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1)

  it('возвращает первую страницу', () => {
    expect(paginate(items, 1, 10)).toEqual(Array.from({ length: 10 }, (_, i) => i + 1))
  })

  it('возвращает последнюю неполную страницу', () => {
    expect(paginate(items, 3, 10)).toEqual([21, 22, 23, 24, 25])
  })

  it('возвращает пустой массив для страницы за пределами данных', () => {
    expect(paginate(items, 4, 10)).toEqual([])
  })
})

describe('pageCount', () => {
  it('считает количество страниц с округлением вверх', () => {
    expect(pageCount(25, 10)).toBe(3)
    expect(pageCount(20, 10)).toBe(2)
  })

  it('возвращает минимум 1 страницу для пустого списка', () => {
    expect(pageCount(0, 10)).toBe(1)
  })
})
