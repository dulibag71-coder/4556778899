/**
 * AI Navigator 백엔드 API 서버
 * Express + TypeScript + PostgreSQL + Redis
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Server } from 'socket.io';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import vehicleRoutes from './routes/vehicle.routes';
import trackingRoutes from './routes/tracking.routes';
import routeRoutes from './routes/route.routes';
import trafficRoutes from './routes/traffic.routes';
import paymentRoutes from './routes/payment.routes';

dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;

// ==========================================
// 미들웨어 설정
// ==========================================

// 보안 헤더
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100, // 최대 100 요청
  message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// 로깅 미들웨어
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// ==========================================
// API Routes
// ==========================================

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/tracking', trackingRoutes);
app.use('/api/v1/routes', routeRoutes);
app.use('/api/v1/traffic', trafficRoutes);
app.use('/api/v1/payments', paymentRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// 루트 경로
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'AI Navigator API',
    version: '1.0.0',
    status: 'running',
    documentation: '/api/docs',
  });
});

// 404 핸들러
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: '요청하신 리소스를 찾을 수 없습니다.',
    path: req.path,
  });
});

// 에러 핸들러
app.use(errorHandler);

// ==========================================
// Socket.IO 실시간 통신
// ==========================================

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // 위치 업데이트 이벤트
  socket.on('location:update', (data) => {
    // 같은 그룹의 사용자들에게 위치 브로드캐스트
    socket.broadcast.to(data.groupId).emit('location:updated', {
      userId: socket.id,
      location: data.location,
      timestamp: new Date().toISOString(),
    });
  });

  // 그룹 참여
  socket.on('group:join', (groupId: string) => {
    socket.join(groupId);
    logger.info(`Socket ${socket.id} joined group ${groupId}`);
  });

  // 그룹 나가기
  socket.on('group:leave', (groupId: string) => {
    socket.leave(groupId);
    logger.info(`Socket ${socket.id} left group ${groupId}`);
  });

  // 연결 해제
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// ==========================================
// 서버 시작
// ==========================================

const startServer = async () => {
  try {
    // 데이터베이스 연결
    await connectDatabase();
    logger.info('PostgreSQL connected successfully');

    // Redis 연결
    await connectRedis();
    logger.info('Redis connected successfully');

    // 서버 시작
    httpServer.listen(PORT, () => {
      logger.info(`
        ================================================
        🚀 AI Navigator API Server is running!
        ================================================
        Environment: ${process.env.NODE_ENV || 'development'}
        Port: ${PORT}
        Database: Connected
        Redis: Connected
        Socket.IO: Enabled
        ================================================
      `);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

// 에러 처리
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// 서버 시작
startServer();

export { app, io };
