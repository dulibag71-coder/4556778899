/**
 * 차량 추적 라우트
 */

import { Router } from 'express';
import {
  updateLocation,
  getCurrentLocation,
  getMultipleLocations,
  getLocationHistory,
  getRoute,
  getNearbyVehicles,
} from '../controllers/tracking.controller';

const router = Router();

// 위치 업데이트
router.post('/update', updateLocation);

// 현재 위치 조회
router.get('/location/:vehicleId', getCurrentLocation);

// 여러 차량 위치 조회
router.get('/locations', getMultipleLocations);

// 위치 히스토리
router.get('/history/:vehicleId', getLocationHistory);

// 주행 경로
router.get('/route/:vehicleId', getRoute);

// 근처 차량
router.get('/nearby', getNearbyVehicles);

export default router;
