/**
 * Authentication Routes
 */

import { Router } from 'express';

const router = Router();

// 회원가입
router.post('/register', (req, res) => {
  res.json({
    success: true,
    message: '회원가입 API - 구현 예정',
    data: {
      userId: 'user_123',
      token: 'jwt_token_here',
    },
  });
});

// 로그인
router.post('/login', (req, res) => {
  res.json({
    success: true,
    message: '로그인 성공',
    data: {
      userId: 'user_123',
      email: req.body.email || 'test@example.com',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo',
      refreshToken: 'refresh_token_demo',
    },
  });
});

// 토큰 갱신
router.post('/refresh', (req, res) => {
  res.json({
    success: true,
    message: '토큰 갱신 성공',
    data: {
      token: 'new_jwt_token_here',
    },
  });
});

// 로그아웃
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: '로그아웃 성공',
  });
});

// 소셜 로그인 - Google
router.post('/google', (req, res) => {
  res.json({
    success: true,
    message: 'Google 로그인 성공',
    data: {
      userId: 'google_user_123',
      token: 'jwt_token_here',
    },
  });
});

// 소셜 로그인 - Apple
router.post('/apple', (req, res) => {
  res.json({
    success: true,
    message: 'Apple 로그인 성공',
    data: {
      userId: 'apple_user_123',
      token: 'jwt_token_here',
    },
  });
});

export default router;
