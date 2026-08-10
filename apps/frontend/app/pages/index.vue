<script setup lang="ts">
const { list } = useEventTypes()

const { data: eventTypes, status, error, refresh } = await useAsyncData(
  'event-types',
  () => list()
)
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-highlighted">
        Выберите тип встречи
      </h1>
      <p class="text-muted mt-1">
        Доступные слоты формируются на 14 дней вперёд, начиная с сегодняшнего дня.
      </p>
    </div>

    <UAlert
      v-if="error"
      data-testid="event-types-error"
      color="error"
      variant="soft"
      :title="getApiErrorMessage(error)"
    />

    <div
      v-else-if="status === 'pending'"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <USkeleton
        v-for="i in 3"
        :key="i"
        class="h-40 w-full"
      />
    </div>

    <UAlert
      v-else-if="!eventTypes?.length"
      data-testid="event-types-empty"
      color="neutral"
      variant="soft"
      title="Пока нет доступных типов событий"
      description="Владелец календаря ещё не создал ни одного типа события."
    />

    <div
      v-else
      data-testid="event-types-list"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <UCard
        v-for="eventType in eventTypes"
        :key="eventType.id"
        data-testid="event-type-card"
        :data-event-type-id="eventType.id"
      >
        <template #header>
          <h2
            class="font-semibold text-highlighted"
            data-testid="event-type-name"
          >
            {{ eventType.name }}
          </h2>
        </template>

        <p
          class="text-muted line-clamp-3"
          data-testid="event-type-description"
        >
          {{ eventType.description }}
        </p>

        <template #footer>
          <div class="flex items-center justify-between gap-3">
            <span
              class="text-sm text-muted flex items-center gap-1"
              data-testid="event-type-duration"
            >
              <UIcon name="i-lucide-clock" />
              {{ eventType.durationMinutes }} мин
            </span>
            <UButton
              :to="`/book/${eventType.id}`"
              data-testid="book-button"
              trailing-icon="i-lucide-arrow-right"
            >
              Записаться
            </UButton>
          </div>
        </template>
      </UCard>
    </div>

    <UButton
      v-if="error"
      data-testid="event-types-retry-button"
      variant="soft"
      icon="i-lucide-refresh-cw"
      @click="refresh()"
    >
      Повторить
    </UButton>
  </div>
</template>
