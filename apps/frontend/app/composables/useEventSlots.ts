import type { components } from '~/types/api'

export type Slot = components['schemas']['Slot']

/**
 * Свободные/занятые слоты конкретного типа события на 14 дней вперёд.
 * Публичный эндпоинт, занятость учитывает бронирования всех типов событий.
 */
export function useEventSlots() {
  const client = useApiClient()

  async function list(eventTypeId: string): Promise<Slot[]> {
    const result = await client.GET('/event-types/{eventTypeId}/slots', {
      params: { path: { eventTypeId } }
    })
    return unwrapApi(result)
  }

  return { list }
}
