<script setup lang="ts">
const links = [
  { label: 'Бронирования', to: '/admin' },
  { label: 'Типы событий', to: '/admin/event-types' }
]
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <UHeader>
      <template #left>
        <NuxtLink
          to="/admin"
          class="font-semibold text-highlighted"
        >
          Панель владельца
        </NuxtLink>
      </template>

      <template #default>
        <UNavigationMenu :items="links" />
      </template>

      <template #right>
        <UColorModeButton />
        <UButton
          to="/"
          variant="ghost"
          color="neutral"
          size="sm"
        >
          На сайт
        </UButton>
      </template>
    </UHeader>

    <UMain class="grow">
      <UContainer class="py-8">
        <slot />
      </UContainer>
    </UMain>
  </div>
</template>
