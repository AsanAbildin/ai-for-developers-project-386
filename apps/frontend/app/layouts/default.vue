<script setup lang="ts">
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <UHeader>
      <template #left>
        <NuxtLink
          to="/"
          class="font-semibold text-highlighted"
        >
          Запись на встречу
        </NuxtLink>
      </template>

      <template #right>
        <UColorModeButton />
      </template>
    </UHeader>

    <UMain class="grow">
      <UContainer class="py-8">
        <slot />
      </UContainer>
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-sm text-muted">
          © {{ new Date().getFullYear() }}
        </p>
      </template>
      <template #right>
        <UButton
          to="/admin"
          variant="ghost"
          color="neutral"
          size="sm"
        >
          Панель владельца
        </UButton>
      </template>
    </UFooter>
  </div>
</template>
