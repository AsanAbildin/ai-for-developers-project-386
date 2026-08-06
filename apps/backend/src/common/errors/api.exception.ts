import { HttpException } from '@nestjs/common';

/**
 * Ошибка API, сериализуемая в форму ApiError { code, message } (models.tsp).
 * Коды соответствуют комментариям в bookings.tsp/event-types.tsp
 * (SLOT_UNAVAILABLE, OUT_OF_WINDOW, ALREADY_CANCELLED,
 * INVALID_CANCELLATION_TOKEN) плюс дополнительные, не противоречащие схеме
 * (схема ApiError.code — произвольная строка, а не enum).
 */
export class ApiException extends HttpException {
  constructor(statusCode: number, code: string, message: string) {
    super({ code, message }, statusCode);
  }
}

export class NotFoundApiException extends ApiException {
  constructor(message: string, code = 'NOT_FOUND') {
    super(404, code, message);
  }
}

export class ConflictApiException extends ApiException {
  constructor(message: string, code: string) {
    super(409, code, message);
  }
}

export class BadRequestApiException extends ApiException {
  constructor(message: string, code: string) {
    super(400, code, message);
  }
}

export class ForbiddenApiException extends ApiException {
  constructor(message: string, code: string) {
    super(403, code, message);
  }
}
