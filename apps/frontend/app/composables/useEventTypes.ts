import type { components } from '~/types/api'

export type EventType = components['schemas']['EventType']
export type EventTypeCreate = components['schemas']['EventTypeCreate']
export type EventTypeUpdate = components['schemas']['EventTypeUpdate']

/**
 * Доступ к ресурсу "типы событий".
 * list/get — публичные эндпоинты (видны гостю),
 * create/update/delete — предполагаются только для владельца календаря.
 */
export function useEventTypes() {
  const client = useApiClient()

  async function list(): Promise<EventType[]> {
    const result = await client.GET('/event-types')
    return unwrapApi(result)
  }

  async function get(id: string): Promise<EventType> {
    const result = await client.GET('/event-types/{id}', {
      params: { path: { id } }
    })
    return unwrapApi(result)
  }

  async function create(body: EventTypeCreate): Promise<EventType> {
    const result = await client.POST('/event-types', { body })
    return unwrapApi(result)
  }

  async function update(id: string, body: EventTypeUpdate): Promise<EventType> {
    const result = await client.PATCH('/event-types/{id}', {
      params: { path: { id } },
      body
    })
    return unwrapApi(result)
  }

  async function remove(id: string): Promise<void> {
    const result = await client.DELETE('/event-types/{id}', {
      params: { path: { id } }
    })
    unwrapApi(result)
  }

  return { list, get, create, update, remove }
}
