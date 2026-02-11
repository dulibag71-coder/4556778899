/**
 * 차량 추적 컨트롤러
 * 실시간 위치 업데이트 및 조회
 */

import { Request, Response } from 'express';
import pool from '../config/database';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { io } from '../server';

interface LocationUpdate {
  vehicleId: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp?: string;
  batteryLevel?: number;
  isCharging?: boolean;
}

/**
 * 위치 업데이트
 * POST /api/v1/tracking/update
 */
export const updateLocation = async (req: Request, res: Response) => {
  try {
    const {
      vehicleId,
      latitude,
      longitude,
      altitude,
      speed,
      heading,
      accuracy,
      timestamp,
      batteryLevel,
      isCharging,
    }: LocationUpdate = req.body;

    // 검증
    if (!vehicleId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'vehicleId, latitude, longitude는 필수입니다.',
      });
    }

    const locationTimestamp = timestamp || new Date().toISOString();

    // PostgreSQL에 저장
    const query = `
      INSERT INTO vehicle_locations (
        vehicle_id, location, latitude, longitude, altitude,
        speed, heading, accuracy, timestamp
      )
      VALUES (
        $1,
        ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography,
        $2, $3, $4, $5, $6, $7, $8
      )
      ON CONFLICT (vehicle_id)
      DO UPDATE SET
        location = EXCLUDED.location,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        altitude = EXCLUDED.altitude,
        speed = EXCLUDED.speed,
        heading = EXCLUDED.heading,
        accuracy = EXCLUDED.accuracy,
        timestamp = EXCLUDED.timestamp,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    const result = await pool.query(query, [
      vehicleId,
      latitude,
      longitude,
      altitude,
      speed,
      heading,
      accuracy,
      locationTimestamp,
    ]);

    // Redis에 캐시 (빠른 조회용)
    const cacheKey = `vehicle:location:${vehicleId}`;
    await redisClient.setex(
      cacheKey,
      300, // 5분 TTL
      JSON.stringify({
        vehicleId,
        latitude,
        longitude,
        speed,
        heading,
        timestamp: locationTimestamp,
      })
    );

    // WebSocket으로 실시간 브로드캐스트
    io.emit('location:update', {
      vehicleId,
      latitude,
      longitude,
      speed,
      heading,
      timestamp: locationTimestamp,
    });

    // 특정 차량 추적자들에게만 전송
    io.to(`vehicle:${vehicleId}`).emit('vehicle:location', {
      latitude,
      longitude,
      speed,
      heading,
      timestamp: locationTimestamp,
    });

    // 지오펜스 체크 (백그라운드)
    checkGeofences(vehicleId, latitude, longitude).catch((err) =>
      logger.error('Geofence check error:', err)
    );

    logger.info(`Location updated for vehicle ${vehicleId}`);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    logger.error('Location update error:', error);
    res.status(500).json({
      success: false,
      error: '위치 업데이트 실패',
    });
  }
};

/**
 * 현재 위치 조회
 * GET /api/v1/tracking/location/:vehicleId
 */
export const getCurrentLocation = async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;

    // Redis 캐시 확인
    const cacheKey = `vehicle:location:${vehicleId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      logger.info(`Location cache hit for vehicle ${vehicleId}`);
      return res.json({
        success: true,
        data: JSON.parse(cached),
        source: 'cache',
      });
    }

    // DB에서 조회
    const query = `
      SELECT
        vehicle_id,
        latitude,
        longitude,
        altitude,
        speed,
        heading,
        accuracy,
        timestamp,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - timestamp)) as seconds_ago
      FROM vehicle_locations
      WHERE vehicle_id = $1;
    `;

    const result = await pool.query(query, [vehicleId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '차량 위치를 찾을 수 없습니다.',
      });
    }

    const location = result.rows[0];

    // Redis에 캐시
    await redisClient.setex(cacheKey, 300, JSON.stringify(location));

    res.json({
      success: true,
      data: location,
      source: 'database',
    });
  } catch (error) {
    logger.error('Get location error:', error);
    res.status(500).json({
      success: false,
      error: '위치 조회 실패',
    });
  }
};

/**
 * 여러 차량 위치 조회
 * GET /api/v1/tracking/locations?vehicleIds=id1,id2,id3
 */
export const getMultipleLocations = async (req: Request, res: Response) => {
  try {
    const { vehicleIds } = req.query;

    if (!vehicleIds) {
      return res.status(400).json({
        success: false,
        error: 'vehicleIds 파라미터가 필요합니다.',
      });
    }

    const ids = (vehicleIds as string).split(',');

    const query = `
      SELECT
        v.id,
        v.vehicle_number,
        v.model,
        vl.latitude,
        vl.longitude,
        vl.speed,
        vl.heading,
        vl.timestamp,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - vl.timestamp)) as seconds_ago
      FROM vehicles v
      LEFT JOIN vehicle_locations vl ON v.id = vl.vehicle_id
      WHERE v.id = ANY($1::uuid[])
      AND v.is_active = true;
    `;

    const result = await pool.query(query, [ids]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    logger.error('Get multiple locations error:', error);
    res.status(500).json({
      success: false,
      error: '위치 조회 실패',
    });
  }
};

/**
 * 위치 히스토리 조회
 * GET /api/v1/tracking/history/:vehicleId?from=timestamp&to=timestamp
 */
export const getLocationHistory = async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;
    const { from, to, limit = 1000 } = req.query;

    let query = `
      SELECT
        latitude,
        longitude,
        altitude,
        speed,
        heading,
        accuracy,
        recorded_at,
        battery_level
      FROM location_history
      WHERE vehicle_id = $1
    `;

    const params: any[] = [vehicleId];

    if (from) {
      query += ` AND recorded_at >= $${params.length + 1}`;
      params.push(from);
    }

    if (to) {
      query += ` AND recorded_at <= $${params.length + 1}`;
      params.push(to);
    }

    query += ` ORDER BY recorded_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    logger.error('Get history error:', error);
    res.status(500).json({
      success: false,
      error: '히스토리 조회 실패',
    });
  }
};

/**
 * 주행 경로 조회 (시간대별)
 * GET /api/v1/tracking/route/:vehicleId?date=YYYY-MM-DD
 */
export const getRoute = async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;
    const { date } = req.query;

    const targetDate = date || new Date().toISOString().split('T')[0];

    const query = `
      SELECT
        latitude,
        longitude,
        speed,
        recorded_at
      FROM location_history
      WHERE vehicle_id = $1
      AND DATE(recorded_at) = $2
      ORDER BY recorded_at ASC;
    `;

    const result = await pool.query(query, [vehicleId, targetDate]);

    // 경로 라인 생성
    if (result.rows.length > 1) {
      const coordinates = result.rows.map((row) => [
        row.longitude,
        row.latitude,
      ]);

      res.json({
        success: true,
        data: {
          date: targetDate,
          points: result.rows,
          route: {
            type: 'LineString',
            coordinates,
          },
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          date: targetDate,
          points: result.rows,
          route: null,
        },
      });
    }
  } catch (error) {
    logger.error('Get route error:', error);
    res.status(500).json({
      success: false,
      error: '경로 조회 실패',
    });
  }
};

/**
 * 근처 차량 조회
 * GET /api/v1/tracking/nearby?lat=37.5665&lng=126.9780&radius=5000
 */
export const getNearbyVehicles = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'lat, lng 파라미터가 필요합니다.',
      });
    }

    const query = `
      SELECT
        v.id,
        v.vehicle_number,
        v.model,
        vl.latitude,
        vl.longitude,
        vl.speed,
        ST_Distance(
          vl.location,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        ) as distance
      FROM vehicles v
      INNER JOIN vehicle_locations vl ON v.id = vl.vehicle_id
      WHERE ST_DWithin(
        vl.location,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        $3
      )
      AND v.is_active = true
      ORDER BY distance ASC
      LIMIT 50;
    `;

    const result = await pool.query(query, [lat, lng, radius]);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    logger.error('Get nearby vehicles error:', error);
    res.status(500).json({
      success: false,
      error: '근처 차량 조회 실패',
    });
  }
};

/**
 * 지오펜스 체크 (내부 함수)
 */
async function checkGeofences(
  vehicleId: string,
  latitude: number,
  longitude: number
) {
  try {
    // 활성화된 지오펜스 조회
    const query = `
      SELECT id, name, type, area
      FROM geofences
      WHERE is_active = true;
    `;

    const result = await pool.query(query);

    for (const geofence of result.rows) {
      const isInside = await isVehicleInGeofence(
        latitude,
        longitude,
        geofence.id
      );

      // 이전 상태 확인
      const prevStateKey = `geofence:${vehicleId}:${geofence.id}`;
      const prevState = await redisClient.get(prevStateKey);

      if (isInside && prevState !== 'inside') {
        // 진입 이벤트
        await createGeofenceEvent(
          vehicleId,
          geofence.id,
          'enter',
          latitude,
          longitude
        );
        await redisClient.setex(prevStateKey, 3600, 'inside');

        // 알림 생성
        await createAlert(vehicleId, {
          type: 'geofence_enter',
          title: `${geofence.name} 진입`,
          message: `차량이 ${geofence.name} 영역에 진입했습니다.`,
          severity: 'info',
        });
      } else if (!isInside && prevState === 'inside') {
        // 이탈 이벤트
        await createGeofenceEvent(
          vehicleId,
          geofence.id,
          'exit',
          latitude,
          longitude
        );
        await redisClient.del(prevStateKey);

        // 알림 생성
        await createAlert(vehicleId, {
          type: 'geofence_exit',
          title: `${geofence.name} 이탈`,
          message: `차량이 ${geofence.name} 영역을 벗어났습니다.`,
          severity: 'warning',
        });
      }
    }
  } catch (error) {
    logger.error('Geofence check error:', error);
  }
}

async function isVehicleInGeofence(
  latitude: number,
  longitude: number,
  geofenceId: string
): Promise<boolean> {
  const query = `SELECT is_in_geofence($1, $2, $3) as is_inside;`;
  const result = await pool.query(query, [latitude, longitude, geofenceId]);
  return result.rows[0].is_inside;
}

async function createGeofenceEvent(
  vehicleId: string,
  geofenceId: string,
  eventType: string,
  latitude: number,
  longitude: number
) {
  const query = `
    INSERT INTO geofence_events (
      vehicle_id, geofence_id, event_type, location, latitude, longitude, occurred_at
    )
    VALUES (
      $1, $2, $3,
      ST_SetSRID(ST_MakePoint($5, $4), 4326)::geography,
      $4, $5, CURRENT_TIMESTAMP
    );
  `;
  await pool.query(query, [
    vehicleId,
    geofenceId,
    eventType,
    latitude,
    longitude,
  ]);
}

async function createAlert(
  vehicleId: string,
  alert: {
    type: string;
    title: string;
    message: string;
    severity: string;
  }
) {
  // 차량 소유자 조회
  const userQuery = `SELECT user_id FROM vehicles WHERE id = $1;`;
  const userResult = await pool.query(userQuery, [vehicleId]);

  if (userResult.rows.length === 0) return;

  const userId = userResult.rows[0].user_id;

  const query = `
    INSERT INTO alerts (user_id, vehicle_id, type, title, message, severity)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const result = await pool.query(query, [
    userId,
    vehicleId,
    alert.type,
    alert.title,
    alert.message,
    alert.severity,
  ]);

  // WebSocket으로 알림 전송
  io.to(`user:${userId}`).emit('alert', result.rows[0]);
}

export default {
  updateLocation,
  getCurrentLocation,
  getMultipleLocations,
  getLocationHistory,
  getRoute,
  getNearbyVehicles,
};
