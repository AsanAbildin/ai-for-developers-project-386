<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'ru' },
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ]
})

useSeoMeta({
  title: 'Запись на встречу',
  description: 'Выберите тип события и свободный слот, чтобы забронировать встречу.'
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
