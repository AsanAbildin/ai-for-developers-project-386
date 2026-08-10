<script setup lang="ts">
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import type { Slot } from '~/composables/useEventSlots'
import type { BookingCreateResult } from '~/composables/useBookings'
import { bookingFormSchema, type BookingFormValues } from '~/utils/validation'
import { getBookingWindowDays, groupSlotsByDay, getAvailableSlots } from '~/utils/dateWindow'

dayjs.locale('ru')

const route = useRoute()
const eventTypeId = route.params.eventTypeId as string

const eventTypes = useEventTypes()
const slotsApi = useEventSlots()
const bookingsApi = useBookings()
const toast = useToast()

const { data: eventType, status: eventTypeStatus, error: eventTypeError } = await useAsyncData(
  () => `event-type-${eventTypeId}`,
  () => eventTypes.get(eventTypeId)
)

const { data: slots, status: slotsStatus, error: slotsError, refresh: refreshSlots } = await useAsyncData(
  () => `slots-${eventTypeId}`,
  () => slotsApi.list(eventTypeId)
)

const days = getBookingWindowDays()
const slotsByDay = computed(() => groupSlotsByDay(slots.value ?? []))

const selectedDayKey = ref(days[0] ? dayjs(days[0]).format('YYYY-MM-DD') : '')
const availableSlotsForSelectedDay = computed(() => {
  const daySlots = slotsByDay.value.get(selectedDayKey.value) ?? []
  return getAvailableSlots(daySlots)
})

const selectedSlot = ref<Slot | null>(null)

function selectDay(dayKey: string) {
  selectedDayKey.value = dayKey
  selectedSlot.value = null
}

function selectSlot(slot: Slot) {
  selectedSlot.value = slot
}

const formState = reactive<BookingFormValues>({
  guestName: '',
  guestEmail: ''
})

const submitting = ref(false)
const bookingResult = ref<BookingCreateResult | null>(null)
const showCancelModal = ref(false)
const cancelling = ref(false)

async function onSubmit() {
  if (!selectedSlot.value) return
  submitting.value = true
  try {
    bookingResult.value = await bookingsApi.create({
      eventTypeId,
      startTime: selectedSlot.value.startTime,
      guestName: formState.guestName,
      guestEmail: formState.guestEmail
    })
  } catch (error) {
    toast.add({
      title: 'Не удалось создать бронирование',
      description: getApiErrorMessage(error),
      color: 'error'
    })
    if (error instanceof ApiError && (error.code === 'SLOT_UNAVAILABLE' || error.status === 409)) {
      selectedSlot.value = null
      await refreshSlots()
    }
  } finally {
    submitting.value = false
  }
}

async function confirmCancel() {
  if (!bookingResult.value) return
  cancelling.value = true
  try {
    await bookingsApi.cancelByGuest(bookingResult.value.id, bookingResult.value.cancellationToken, {})
    toast.add({ title: 'Бронирование отменено', color: 'success' })
    bookingResult.value = null
    showCancelModal.value = false
    await refreshSlots()
  } catch (error) {
    toast.add({
      title: 'Не удалось отменить бронирование',
      description: getApiErrorMessage(error),
      color: 'error'
    })
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-3xl">
    <UButton
      to="/"
      variant="ghost"
      icon="i-lucide-arrow-left"
      size="sm"
    >
      Ко всем типам событий
    </UButton>

    <UAlert
      v-if="eventTypeError"
      data-testid="event-type-error"
      color="error"
      variant="soft"
      :title="getApiErrorMessage(eventTypeError)"
    />

    <template v-else-if="eventTypeStatus === 'success' && eventType">
      <div>
        <h1
          class="text-2xl font-bold text-highlighted"
          data-testid="booking-event-type-name"
        >
          {{ eventType.name }}
        </h1>
        <p class="text-muted mt-1">
          {{ eventType.description }}
        </p>
        <p class="text-sm text-muted mt-1 flex items-center gap-1">
          <UIcon name="i-lucide-clock" />
          {{ eventType.durationMinutes }} мин
        </p>
      </div>

      <!-- Успешное бронирование -->
      <UCard
        v-if="bookingResult"
        data-testid="booking-confirmation"
        class="border border-success"
      >
        <template #header>
          <div class="flex items-center gap-2 text-success">
            <UIcon name="i-lucide-check-circle-2" />
            <h2 class="font-semibold">
              Бронирование подтверждено
            </h2>
          </div>
        </template>

        <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt class="text-muted">
            Дата и время
          </dt>
          <dd data-testid="booking-start-time">
            {{ dayjs(bookingResult.startTime).format('D MMMM YYYY, HH:mm') }}
          </dd>
          <dt class="text-muted">
            Имя
          </dt>
          <dd>{{ bookingResult.guestName }}</dd>
          <dt class="text-muted">
            Email
          </dt>
          <dd>{{ bookingResult.guestEmail }}</dd>
        </dl>

        <UAlert
          class="mt-4"
          color="warning"
          variant="soft"
          icon="i-lucide-key-round"
          title="Сохраните токен отмены"
          :description="bookingResult.cancellationToken"
          data-testid="cancellation-token"
          :data-cancellation-token="bookingResult.cancellationToken"
        />

        <template #footer>
          <UButton
            color="error"
            variant="soft"
            icon="i-lucide-x"
            data-testid="open-cancel-booking-button"
            @click="showCancelModal = true"
          >
            Отменить бронирование
          </UButton>
        </template>
      </UCard>

      <!-- Форма бронирования -->
      <template v-else>
        <UAlert
          v-if="slotsError"
          data-testid="slots-error"
          color="error"
          variant="soft"
          :title="getApiErrorMessage(slotsError)"
        />

        <template v-else>
          <div>
            <h2 class="font-semibold text-highlighted mb-2">
              Выберите день
            </h2>
            <div
              class="flex gap-2 overflow-x-auto pb-2"
              data-testid="day-list"
            >
              <UButton
                v-for="day in days"
                :key="day.toISOString()"
                :variant="selectedDayKey === dayjs(day).format('YYYY-MM-DD') ? 'solid' : 'outline'"
                color="neutral"
                class="flex-col items-center min-w-16"
                data-testid="day-button"
                :data-day="dayjs(day).format('YYYY-MM-DD')"
                @click="selectDay(dayjs(day).format('YYYY-MM-DD'))"
              >
                <span class="text-xs uppercase">{{ dayjs(day).format('dd') }}</span>
                <span class="font-semibold">{{ dayjs(day).format('D MMM') }}</span>
              </UButton>
            </div>
          </div>

          <div>
            <h2 class="font-semibold text-highlighted mb-2">
              Свободные слоты
            </h2>

            <USkeleton
              v-if="slotsStatus === 'pending'"
              class="h-24 w-full"
            />

            <UAlert
              v-else-if="!availableSlotsForSelectedDay.length"
              data-testid="slots-empty"
              color="neutral"
              variant="soft"
              title="На выбранный день свободных слотов нет"
            />

            <div
              v-else
              class="flex flex-wrap gap-2"
              data-testid="slot-list"
            >
              <UButton
                v-for="slot in availableSlotsForSelectedDay"
                :key="slot.startTime"
                :variant="selectedSlot?.startTime === slot.startTime ? 'solid' : 'outline'"
                color="primary"
                data-testid="slot-button"
                :data-slot-start-time="slot.startTime"
                @click="selectSlot(slot)"
              >
                {{ dayjs(slot.startTime).format('HH:mm') }}
              </UButton>
            </div>
          </div>

          <UCard
            v-if="selectedSlot"
            data-testid="booking-form-card"
          >
            <template #header>
              <h2 class="font-semibold text-highlighted">
                Ваши данные
              </h2>
            </template>

            <UForm
              :schema="bookingFormSchema"
              :state="formState"
              class="space-y-4"
              data-testid="booking-form"
              @submit="onSubmit"
            >
              <UFormField
                label="Имя"
                name="guestName"
                required
              >
                <UInput
                  v-model="formState.guestName"
                  class="w-full"
                  placeholder="Иван Иванов"
                  data-testid="guest-name-input"
                />
              </UFormField>

              <UFormField
                label="Email"
                name="guestEmail"
                required
              >
                <UInput
                  v-model="formState.guestEmail"
                  type="email"
                  class="w-full"
                  placeholder="ivan@example.com"
                  data-testid="guest-email-input"
                />
              </UFormField>

              <UButton
                type="submit"
                :loading="submitting"
                block
                data-testid="submit-booking-button"
              >
                Забронировать на {{ dayjs(selectedSlot.startTime).format('D MMMM, HH:mm') }}
              </UButton>
            </UForm>
          </UCard>
        </template>
      </template>
    </template>

    <UModal
      v-model:open="showCancelModal"
    >
      <template #content>
        <UCard>
          <template #header>
            <h3 class="font-semibold">
              Отменить бронирование?
            </h3>
          </template>

          <p class="text-muted">
            Это действие нельзя отменить. Слот снова станет доступен для других гостей.
          </p>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                color="neutral"
                data-testid="guest-cancel-dismiss-button"
                @click="showCancelModal = false"
              >
                Нет, оставить
              </UButton>
              <UButton
                color="error"
                :loading="cancelling"
                data-testid="guest-cancel-confirm-button"
                @click="confirmCancel"
              >
                Да, отменить
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
