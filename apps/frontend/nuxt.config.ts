// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  // Бэкенд занимает порт 3000 (см. NUXT_PUBLIC_API_BASE_URL), поэтому
  // фронтенд в dev-режиме поднимается на отдельном порту 3001.
  devServer: {
    port: 3001
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBaseUrl: 'http://localhost:3000/api'
    }
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
