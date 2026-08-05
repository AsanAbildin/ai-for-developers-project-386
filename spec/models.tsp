import "@typespec/http";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.Rest;

namespace SchedulingApi;

/**
 * Размер окна доступности для бронирования, в днях от текущей даты.
 * Гость может выбрать слот только в пределах [now, now + BOOKING_WINDOW_DAYS].
 */
const BOOKING_WINDOW_DAYS: int32 = 14;

/** Статус бронирования. Отмена не удаляет запись физически. */
enum BookingStatus {
  accepted,
  cancelled,
}

/**
 * Тип события. Создаётся и управляется владельцем календаря
 * (единственный предзаданный профиль, без регистрации/авторизации).
 */
model EventType {
  @key
  id: string;

  @minLength(1)
  name: string;

  description: string;

  /** Длительность события в минутах, должна быть положительной */
  @minValue(1)
  durationMinutes: int32;
}

/** Данные для создания типа события */
model EventTypeCreate {
  @minLength(1)
  name: string;

  description: string;

  @minValue(1)
  durationMinutes: int32;
}

/** Данные для частичного обновления типа события */
model EventTypeUpdate {
  name?: string;
  description?: string;
  durationMinutes?: int32;
}

/**
 * Бронирование гостем свободного слота одного из типов событий.
 * Гость создаёт бронь без аккаунта, поэтому имя/email фиксируются
 * прямо в записи, а отмена своей брони гостем выполняется по
 * cancellationToken, а не по авторизации.
 */
model Booking {
  @key
  id: string;

  /**
   * Ссылка на тип события. Может быть null, если исходный EventType
   * был позже удалён владельцем — при этом сама бронь не пропадает
   * (см. EventTypeName/durationMinutes-снэпшот ниже).
   */
  eventTypeId: string | null;

  /** Снэпшот названия типа события на момент создания брони */
  eventTypeName: string;

  /** Снэпшот длительности (в минутах) на момент создания брони */
  durationMinutes: int32;

  /** Начало забронированного интервала */
  startTime: utcDateTime;

  /** Конец интервала: startTime + durationMinutes */
  endTime: utcDateTime;

  guestName: string;
  guestEmail: string;

  status: BookingStatus;

  /** Причина отмены, если статус cancelled */
  cancellationReason?: string;

  createdAt: utcDateTime;
}

/**
 * Ответ на создание брони — единственный момент, когда возвращается
 * cancellationToken. Гость должен сохранить его, чтобы отменить бронь
 * без аутентификации.
 */
model BookingCreateResult {
  ...Booking;
  cancellationToken: string;
}

/** Данные для создания бронирования гостем */
model BookingCreate {
  eventTypeId: string;

  /** Должен попадать в окно [now, now + BOOKING_WINDOW_DAYS] */
  startTime: utcDateTime;

  @minLength(1)
  guestName: string;

  @format("email")
  guestEmail: string;
}

/** Данные для отмены бронирования */
model BookingCancel {
  cancellationReason?: string;
}

/** Свободный/занятый интервал в календаре типа события (вычисляемая сущность) */
model Slot {
  startTime: utcDateTime;
  endTime: utcDateTime;
  isAvailable: boolean;
}

/** Стандартная модель ошибки API */
@error
model ApiError {
  code: string;
  message: string;
}
