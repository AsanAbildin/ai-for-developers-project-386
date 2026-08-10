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

// Маркер завершения гидратации: SSR-разметка приходит в DOM раньше, чем Vue
// навесит обработчики событий. E2E-тесты ждут data-hydrated="true" перед
// кликами, иначе клик по статичному DOM ничего не делает.
const hydrated = ref(false)
onMounted(() => {
  hydrated.value = true
})
</script>

<template>
  <div :data-hydrated="hydrated ? 'true' : 'false'">
    <UApp>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </UApp>
  </div>
</template>
