<script setup lang="ts">
import type { EventType } from '~/composables/useEventTypes'
import { eventTypeFormSchema, type EventTypeFormValues } from '~/utils/validation'

definePageMeta({ layout: 'admin' })

const eventTypesApi = useEventTypes()
const toast = useToast()

const { data: eventTypes, status, error, refresh } = await useAsyncData(
  'admin-event-types',
  () => eventTypesApi.list()
)

const isModalOpen = ref(false)
const editingId = ref<string | null>(null)
const submitting = ref(false)
const formState = reactive<EventTypeFormValues>({
  name: '',
  description: '',
  durationMinutes: 30
})

function openCreateModal() {
  editingId.value = null
  formState.name = ''
  formState.description = ''
  formState.durationMinutes = 30
  isModalOpen.value = true
}

function openEditModal(eventType: EventType) {
  editingId.value = eventType.id
  formState.name = eventType.name
  formState.description = eventType.description
  formState.durationMinutes = eventType.durationMinutes
  isModalOpen.value = true
}

async function onSubmit() {
  submitting.value = true
  try {
    if (editingId.value) {
      await eventTypesApi.update(editingId.value, { ...formState })
      toast.add({ title: 'Тип события обновлён', color: 'success' })
    } else {
      await eventTypesApi.create({ ...formState })
      toast.add({ title: 'Тип события создан', color: 'success' })
    }
    isModalOpen.value = false
    await refresh()
  } catch (err) {
    toast.add({
      title: 'Не удалось сохранить тип события',
      description: getApiErrorMessage(err),
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}

const deleteTarget = ref<EventType | null>(null)
const deleting = ref(false)

async function confirmDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await eventTypesApi.remove(deleteTarget.value.id)
    toast.add({ title: 'Тип события удалён', color: 'success' })
    deleteTarget.value = null
    await refresh()
  } catch (err) {
    toast.add({
      title: 'Не удалось удалить тип события',
      description: getApiErrorMessage(err),
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-highlighted">
          Типы событий
        </h1>
        <p class="text-muted mt-1">
          Гости выбирают один из этих типов, чтобы забронировать встречу.
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        data-testid="add-event-type-button"
        @click="openCreateModal"
      >
        Добавить тип
      </UButton>
    </div>

    <UAlert
      v-if="error"
      data-testid="admin-event-types-error"
      color="error"
      variant="soft"
      :title="getApiErrorMessage(error)"
    />

    <USkeleton
      v-else-if="status === 'pending'"
      class="h-48 w-full"
    />

    <UAlert
      v-else-if="!eventTypes?.length"
      data-testid="admin-event-types-empty"
      color="neutral"
      variant="soft"
      title="Пока нет типов событий"
    />

    <div
      v-else
      data-testid="admin-event-types-list"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <UCard
        v-for="eventType in eventTypes"
        :key="eventType.id"
        data-testid="admin-event-type-card"
        :data-event-type-id="eventType.id"
      >
        <template #header>
          <h2
            class="font-semibold text-highlighted"
            data-testid="admin-event-type-name"
          >
            {{ eventType.name }}
          </h2>
        </template>

        <p class="text-muted line-clamp-3">
          {{ eventType.description }}
        </p>

        <template #footer>
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm text-muted flex items-center gap-1">
              <UIcon name="i-lucide-clock" />
              {{ eventType.durationMinutes }} мин
            </span>
            <div class="flex gap-2">
              <UButton
                size="xs"
                variant="soft"
                icon="i-lucide-pencil"
                data-testid="edit-event-type-button"
                @click="openEditModal(eventType)"
              >
                Изменить
              </UButton>
              <UButton
                size="xs"
                color="error"
                variant="soft"
                icon="i-lucide-trash-2"
                data-testid="delete-event-type-button"
                @click="deleteTarget = eventType"
              >
                Удалить
              </UButton>
            </div>
          </div>
        </template>
      </UCard>
    </div>

    <UModal v-model:open="isModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h3 class="font-semibold">
              {{ editingId ? 'Изменить тип события' : 'Новый тип события' }}
            </h3>
          </template>

          <UForm
            :schema="eventTypeFormSchema"
            :state="formState"
            class="space-y-4"
            data-testid="event-type-form"
            @submit="onSubmit"
          >
            <UFormField
              label="Название"
              name="name"
              required
            >
              <UInput
                v-model="formState.name"
                class="w-full"
                data-testid="event-type-name-input"
              />
            </UFormField>

            <UFormField
              label="Описание"
              name="description"
            >
              <UTextarea
                v-model="formState.description"
                class="w-full"
                data-testid="event-type-description-input"
              />
            </UFormField>

            <UFormField
              label="Длительность (мин)"
              name="durationMinutes"
              required
            >
              <UInput
                v-model.number="formState.durationMinutes"
                type="number"
                min="1"
                class="w-full"
                data-testid="event-type-duration-input"
              />
            </UFormField>

            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                color="neutral"
                data-testid="event-type-form-cancel-button"
                @click="isModalOpen = false"
              >
                Отмена
              </UButton>
              <UButton
                type="submit"
                :loading="submitting"
                data-testid="event-type-form-submit-button"
              >
                Сохранить
              </UButton>
            </div>
          </UForm>
        </UCard>
      </template>
    </UModal>

    <UModal
      :open="!!deleteTarget"
      @update:open="(v) => { if (!v) deleteTarget = null }"
    >
      <template #content>
        <UCard v-if="deleteTarget">
          <template #header>
            <h3 class="font-semibold">
              Удалить тип события?
            </h3>
          </template>

          <p class="text-muted">
            «{{ deleteTarget.name }}» будет удалён. Существующие бронирования этого типа
            не будут удалены и продолжат отображаться в списке встреч.
          </p>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                color="neutral"
                data-testid="delete-event-type-cancel-button"
                @click="deleteTarget = null"
              >
                Отмена
              </UButton>
              <UButton
                color="error"
                :loading="deleting"
                data-testid="delete-event-type-confirm-button"
                @click="confirmDelete"
              >
                Удалить
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
