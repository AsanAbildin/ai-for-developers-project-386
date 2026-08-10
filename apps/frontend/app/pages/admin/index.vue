<script setup lang="ts">
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import type { Booking } from '~/composables/useBookings'
import { paginate, pageCount } from '~/utils/paginate'

dayjs.locale('ru')

definePageMeta({ layout: 'admin' })

const bookingsApi = useBookings()
const toast = useToast()

const { data: bookings, status, error, refresh } = await useAsyncData(
  'admin-bookings',
  () => bookingsApi.list()
)

const sortedBookings = computed(() =>
  [...(bookings.value ?? [])].sort(
    (a, b) => dayjs(a.startTime).valueOf() - dayjs(b.startTime).valueOf()
  )
)

const page = ref(1)
const pageSize = 10
const totalPages = computed(() => pageCount(sortedBookings.value.length, pageSize))
const pagedBookings = computed(() => paginate(sortedBookings.value, page.value, pageSize))

const cancelTarget = ref<Booking | null>(null)
const cancelReason = ref('')
const cancelling = ref(false)

function openCancelModal(booking: Booking) {
  cancelTarget.value = booking
  cancelReason.value = ''
}

async function confirmCancel() {
  if (!cancelTarget.value) return
  cancelling.value = true
  try {
    await bookingsApi.cancelByOwner(cancelTarget.value.id, {
      cancellationReason: cancelReason.value || undefined
    })
    toast.add({ title: 'Бронирование отменено', color: 'success' })
    cancelTarget.value = null
    await refresh()
  } catch (err) {
    toast.add({
      title: 'Не удалось отменить бронирование',
      description: getApiErrorMessage(err),
      color: 'error'
    })
  } finally {
    cancelling.value = false
  }
}

function statusLabel(booking: Booking) {
  return booking.status === 'cancelled' ? 'Отменено' : 'Подтверждено'
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-highlighted">
        Предстоящие бронирования
      </h1>
      <p class="text-muted mt-1">
        Все бронирования по всем типам событий, отсортированы по времени начала.
      </p>
    </div>

    <UAlert
      v-if="error"
      data-testid="admin-bookings-error"
      color="error"
      variant="soft"
      :title="getApiErrorMessage(error)"
    />

    <USkeleton
      v-else-if="status === 'pending'"
      class="h-64 w-full"
    />

    <UAlert
      v-else-if="!sortedBookings.length"
      data-testid="admin-bookings-empty"
      color="neutral"
      variant="soft"
      title="Бронирований пока нет"
    />

    <template v-else>
      <div class="overflow-x-auto rounded-lg border border-default">
        <table
          class="w-full text-sm"
          data-testid="admin-bookings-table"
        >
          <thead class="bg-elevated text-left">
            <tr>
              <th class="p-3">
                Дата и время
              </th>
              <th class="p-3">
                Тип события
              </th>
              <th class="p-3">
                Гость
              </th>
              <th class="p-3">
                Статус
              </th>
              <th class="p-3" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="booking in pagedBookings"
              :key="booking.id"
              class="border-t border-default"
              data-testid="booking-row"
              :data-booking-id="booking.id"
            >
              <td
                class="p-3 whitespace-nowrap"
                data-testid="booking-row-start-time"
              >
                {{ dayjs(booking.startTime).format('D MMM YYYY, HH:mm') }}
              </td>
              <td
                class="p-3"
                data-testid="booking-row-event-type"
              >
                {{ booking.eventTypeName }} ({{ booking.durationMinutes }} мин)
              </td>
              <td class="p-3">
                <div data-testid="booking-row-guest-name">
                  {{ booking.guestName }}
                </div>
                <div class="text-muted text-xs">
                  {{ booking.guestEmail }}
                </div>
              </td>
              <td class="p-3">
                <UBadge
                  :color="booking.status === 'cancelled' ? 'neutral' : 'success'"
                  variant="subtle"
                  data-testid="booking-row-status"
                >
                  {{ statusLabel(booking) }}
                </UBadge>
              </td>
              <td class="p-3 text-right">
                <UButton
                  v-if="booking.status !== 'cancelled'"
                  size="xs"
                  color="error"
                  variant="soft"
                  data-testid="cancel-booking-button"
                  @click="openCancelModal(booking)"
                >
                  Отменить
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="totalPages > 1"
        class="flex justify-center"
        data-testid="admin-bookings-pagination"
      >
        <UPagination
          v-model:page="page"
          :total="sortedBookings.length"
          :items-per-page="pageSize"
        >
          <template #next>
            <UButton
              icon="i-lucide-chevron-right"
              variant="outline"
              color="neutral"
              square
              data-testid="bookings-next-page-button"
            />
          </template>
          <template #prev>
            <UButton
              icon="i-lucide-chevron-left"
              variant="outline"
              color="neutral"
              square
              data-testid="bookings-prev-page-button"
            />
          </template>
        </UPagination>
      </div>
    </template>

    <UModal
      :open="!!cancelTarget"
      @update:open="(v) => { if (!v) cancelTarget = null }"
    >
      <template #content>
        <UCard v-if="cancelTarget">
          <template #header>
            <h3 class="font-semibold">
              Отменить бронирование?
            </h3>
          </template>

          <p class="text-muted mb-3">
            {{ cancelTarget.guestName }} — {{ dayjs(cancelTarget.startTime).format('D MMMM YYYY, HH:mm') }}
          </p>

          <UFormField label="Причина отмены (необязательно)">
            <UTextarea
              v-model="cancelReason"
              class="w-full"
              placeholder="Например: изменилось расписание владельца"
              data-testid="owner-cancel-reason-input"
            />
          </UFormField>

          <template #footer>
            <div class="flex justify-end gap-2">
              <UButton
                variant="ghost"
                color="neutral"
                data-testid="owner-cancel-dismiss-button"
                @click="cancelTarget = null"
              >
                Нет, оставить
              </UButton>
              <UButton
                color="error"
                :loading="cancelling"
                data-testid="owner-cancel-confirm-button"
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
