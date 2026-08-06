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
    const { public: { apiBaseUrl } } = useRuntimeConfig()
    client = createClient<paths>({ baseUrl: apiBaseUrl })
  }
  return client
}
