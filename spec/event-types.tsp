import "@typespec/http";
import "@typespec/rest";
import "./models.tsp";

using TypeSpec.Http;
using TypeSpec.Rest;

namespace SchedulingApi;

@route("/event-types")
@tag("EventTypes")
interface EventTypes {
  /** Создать тип события. Доступно только владельцу календаря. */
  @post
  create(@body body: EventTypeCreate): {
    @statusCode statusCode: 201;
    @body eventType: EventType;
  };

  /**
   * Список всех типов событий. Публичный эндпоинт — гость видит
   * название, описание и длительность, чтобы выбрать тип бронирования.
   */
  @get
  list(): EventType[];

  /** Получить один тип события по id. Публичный эндпоинт. */
  @get
  read(@path id: string): EventType | {
    @statusCode statusCode: 404;
    @body error: ApiError;
  };

  /** Частично обновить тип события. Доступно только владельцу. */
  @patch
  update(@path id: string, @body body: EventTypeUpdate):
    | EventType
    | {
        @statusCode statusCode: 404;
        @body error: ApiError;
      };

  /**
   * Удалить тип события. Доступно только владельцу.
   * Существующие бронирования по этому типу НЕ удаляются и НЕ блокируют
   * удаление — они хранят снэпшот name/durationMinutes и продолжают
   * отображаться в списке встреч владельца.
   */
  @delete
  delete(@path id: string): {
    @statusCode statusCode: 204;
  } | {
    @statusCode statusCode: 404;
    @body error: ApiError;
  };
}
