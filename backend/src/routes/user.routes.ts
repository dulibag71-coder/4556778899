/**
 * User Routes
 */

import { Router } from 'express';

const router = Router();

// 내 정보 조회
router.get('/me', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'user_123',
      email: 'test@example.com',
      name: '홍길동',
      phone: '010-1234-5678',
      createdAt: new Date().toISOString(),
    },
  });
});

// 프로필 업데이트
router.put('/me', (req, res) => {
  res.json({
    success: true,
    message: '프로필 업데이트 성공',
    data: req.body,
  });
});

// 내 차량 목록
router.get('/:id/vehicles', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'vehicle_1',
        number: '12가3456',
        model: '현대 아반떼',
        year: 2023,
      },
    ],
  });
});

export default router;
