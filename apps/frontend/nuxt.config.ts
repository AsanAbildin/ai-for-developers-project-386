// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Абсолютный URL для server-side фетчей (SSR): клиент не может обращаться
    // к внутренним адресам контейнера. Задаётся через NUXT_API_BASE_URL_SERVER
    // (см. docker/start.sh). Если пуст — сервер использует публичный apiBaseUrl.
    apiBaseUrlServer: '',
    public: {
      // В браузере используется относительный /api (тот же origin), который
      // фронтенд проксирует на бэкенд (см. server/routes/api).
      apiBaseUrl: 'http://localhost:3000/api'
    }
  },

  // Бэкенд занимает порт 3000 (см. NUXT_PUBLIC_API_BASE_URL), поэтому
  // фронтенд в dev-режиме поднимается на отдельном порту 3001.
  devServer: {
    port: 3001
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
