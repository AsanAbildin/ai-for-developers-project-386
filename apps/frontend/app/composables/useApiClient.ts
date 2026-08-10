import createClient, { type Client } from 'openapi-fetch'
import type { paths } from '~/types/api'

let client: Client<paths> | undefined

/**
 * Типизированный клиент Scheduling API, сгенерированный из openapi.yaml.
 * baseURL берётся из runtime config (NUXT_PUBLIC_API_BASE_URL), поэтому
 * фронтенд может работать с любым отдельно запущенным бэкендом.
 */
export function useApiClient() {
  if (!client) {
    const runtimeConfig = useRuntimeConfig()
    // На сервере (SSR) нужен абсолютный URL — относительный /api не разрешается
    // в Node-фетче. На клиенте — относительный /api (тот же origin), который
    // фронтенд проксирует на бэкенд (см. server/routes/api).
    const base = import.meta.server
      ? (runtimeConfig.apiBaseUrlServer || runtimeConfig.public.apiBaseUrl)
      : runtimeConfig.public.apiBaseUrl
    client = createClient<paths>({ baseUrl: base })
  }
  return client
}
