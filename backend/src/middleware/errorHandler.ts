/**
 * Global Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = { ...err };
  error.message = err.message;

  // 로그 출력
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // Mongoose 중복 키 에러
  if ((err as any).code === 11000) {
    const message = '중복된 값이 존재합니다.';
    error = new AppError(message, 400);
  }

  // Mongoose Validation 에러
  if (err.name === 'ValidationError') {
    const message = Object.values((err as any).errors)
      .map((val: any) => val.message)
      .join(', ');
    error = new AppError(message, 400);
  }

  // JWT 에러
  if (err.name === 'JsonWebTokenError') {
    const message = '유효하지 않은 토큰입니다.';
    error = new AppError(message, 401);
  }

  // JWT 만료 에러
  if (err.name === 'TokenExpiredError') {
    const message = '토큰이 만료되었습니다.';
    error = new AppError(message, 401);
  }

  const statusCode = (error as AppError).statusCode || 500;
  const message = error.message || '서버 오류가 발생했습니다.';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
