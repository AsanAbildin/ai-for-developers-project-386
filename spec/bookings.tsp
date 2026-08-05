import "@typespec/http";
import "@typespec/rest";
import "./models.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;

namespace SchedulingApi;

@route("/event-types/{eventTypeId}/slots")
@tag("Slots")
interface Slots {
  /**
   * Свободные и занятые слоты для конкретного типа события на
   * BOOKING_WINDOW_DAYS (14) дней вперёд, начиная с текущей даты.
   * Занятость учитывает бронирования всех типов событий
   * (правило: на одно и то же время нельзя создать две записи).
   * Публичный эндпоинт.
   */
  @get
  list(@path eventTypeId: string): Slot[] | {
    @statusCode statusCode: 404;
    @body error: ApiError;
  };
}

@route("/bookings")
@tag("Bookings")
interface Bookings {
  /**
   * Создать бронирование выбранного слота. Публичный эндпоинт для гостя.
   * Возвращает cancellationToken, который гость должен сохранить,
   * чтобы позже отменить свою бронь без аутентификации.
   */
  @post
  create(@body body: BookingCreate):
    | {
        @statusCode statusCode: 201;
        @body result: BookingCreateResult;
      }
    | {
        @statusCode statusCode: 409;
        @body error: ApiError; // SLOT_UNAVAILABLE
      }
    | {
        @statusCode statusCode: 400;
        @body error: ApiError; // OUT_OF_WINDOW
      };

  /**
   * Список всех предстоящих бронирований по всем типам событий,
   * отсортированный по startTime. Доступно только владельцу календаря.
   */
  @get
  list(): Booking[];

  /**
   * Отменить бронирование от имени владельца календаря.
   * Не требует cancellationToken.
   */
  @post
  @route("/{id}/cancel")
  cancelByOwner(@path id: string, @body body: BookingCancel):
    | Booking
    | {
        @statusCode statusCode: 404;
        @body error: ApiError;
      }
    | {
        @statusCode statusCode: 409;
        @body error: ApiError; // ALREADY_CANCELLED
      };

  /**
   * Отменить своё бронирование от имени гостя.
   * Требует cancellationToken, выданный при создании брони.
   */
  @post
  @route("/{id}/guest-cancel")
  cancelByGuest(
    @path id: string,
    @query cancellationToken: string,
    @body body: BookingCancel,
  ):
    | Booking
    | {
        @statusCode statusCode: 403;
        @body error: ApiError; // INVALID_CANCELLATION_TOKEN
      }
    | {
        @statusCode statusCode: 404;
        @body error: ApiError;
      }
    | {
        @statusCode statusCode: 409;
        @body error: ApiError; // ALREADY_CANCELLED
      };
}
