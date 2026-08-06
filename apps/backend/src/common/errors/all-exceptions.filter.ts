import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

interface ApiErrorBody {
  code: string;
  message: string;
}

/**
 * Приводит любую ошибку (в том числе брошенную ValidationPipe и
 * непредвиденные исключения) к единому виду ApiError { code, message },
 * описанному в models.tsp.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response.status(status).json(toApiError(status, body));
      return;
    }

    this.logger.error(exception);
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ code: 'INTERNAL_ERROR', message: 'Внутренняя ошибка сервера' });
  }
}

function toApiError(status: number, body: unknown): ApiErrorBody {
  // Наши собственные ApiException уже кладут { code, message } в getResponse().
  if (isApiErrorBody(body)) {
    return body;
  }

  // Ошибки ValidationPipe (400) и стандартные HttpException Nest приходят
  // в форме { message, error, statusCode } — приводим к ApiError.
  const message = extractMessage(body) ?? 'Ошибка запроса';
  return { code: status === 404 ? 'NOT_FOUND' : 'VALIDATION_ERROR', message };
}

function isApiErrorBody(body: unknown): body is ApiErrorBody {
  return (
    typeof body === 'object' &&
    body !== null &&
    typeof (body as Record<string, unknown>).code === 'string' &&
    typeof (body as Record<string, unknown>).message === 'string'
  );
}

function extractMessage(body: unknown): string | undefined {
  if (typeof body === 'string') return body;
  if (typeof body === 'object' && body !== null) {
    const message = (body as Record<string, unknown>).message;
    if (Array.isArray(message)) return message.join('; ');
    if (typeof message === 'string') return message;
  }
  return undefined;
}
