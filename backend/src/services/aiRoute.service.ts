/**
 * AI 경로 최적화 서비스
 * 머신러닝 기반 최적 경로 계산
 */

import axios from 'axios';
import * as turf from '@turf/turf';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

interface Location {
  latitude: number;
  longitude: number;
}

interface RouteOptions {
  mode: 'fastest' | 'shortest' | 'ai-recommended' | 'eco';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  avoidFerries?: boolean;
}

interface TrafficData {
  congestionLevel: number; // 0-1
  incidents: any[];
  roadworks: any[];
  averageSpeed: number;
}

interface RouteResult {
  distance: number; // meters
  duration: number; // seconds
  polyline: Location[];
  instructions: any[];
  eta: Date;
  confidence: number;
  alternativeRoutes: any[];
}

class AIRouteService {
  private readonly GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;
  private readonly CACHE_TTL = 300; // 5분

  /**
   * AI 기반 최적 경로 계산
   */
  async calculateRoute(
    origin: Location,
    destination: Location,
    options: RouteOptions = { mode: 'ai-recommended' }
  ): Promise<RouteResult> {
    try {
      // 캐시 확인
      const cacheKey = this.getCacheKey(origin, destination, options);
      const cachedRoute = await this.getFromCache(cacheKey);

      if (cachedRoute) {
        logger.info('Returning cached route');
        return cachedRoute;
      }

      // 여러 경로 옵션 계산
      const [fastestRoute, shortestRoute, trafficData] = await Promise.all([
        this.calculateFastestRoute(origin, destination),
        this.calculateShortestRoute(origin, destination),
        this.getTrafficData(origin, destination),
      ]);

      // AI 모델로 최적 경로 선택
      const aiRoute = await this.applyAIOptimization(
        fastestRoute,
        shortestRoute,
        trafficData,
        options
      );

      // ETA 계산 (AI 예측)
      const eta = await this.predictETA(aiRoute, trafficData);

      const result: RouteResult = {
        ...aiRoute,
        eta,
        confidence: this.calculateConfidence(aiRoute, trafficData),
        alternativeRoutes: [fastestRoute, shortestRoute],
      };

      // 캐시 저장
      await this.saveToCache(cacheKey, result);

      return result;

    } catch (error) {
      logger.error('Route calculation error:', error);
      throw new Error('경로 계산에 실패했습니다.');
    }
  }

  /**
   * 최단 시간 경로 계산
   */
  private async calculateFastestRoute(
    origin: Location,
    destination: Location
  ): Promise<any> {
    const url = 'https://maps.googleapis.com/maps/api/directions/json';

    const response = await axios.get(url, {
      params: {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        mode: 'driving',
        departure_time: 'now',
        traffic_model: 'best_guess',
        key: this.GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    return this.parseGoogleRoute(response.data.routes[0]);
  }

  /**
   * 최단 거리 경로 계산
   */
  private async calculateShortestRoute(
    origin: Location,
    destination: Location
  ): Promise<any> {
    const url = 'https://maps.googleapis.com/maps/api/directions/json';

    const response = await axios.get(url, {
      params: {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        mode: 'driving',
        alternatives: true,
        key: this.GOOGLE_MAPS_API_KEY,
      },
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${response.data.status}`);
    }

    // 가장 짧은 경로 선택
    const routes = response.data.routes;
    const shortestRoute = routes.reduce((prev: any, current: any) => {
      return current.legs[0].distance.value < prev.legs[0].distance.value
        ? current
        : prev;
    });

    return this.parseGoogleRoute(shortestRoute);
  }

  /**
   * 실시간 교통 정보 가져오기
   */
  private async getTrafficData(
    origin: Location,
    destination: Location
  ): Promise<TrafficData> {
    try {
      // 실제로는 Google Maps Traffic API 또는 다른 교통 정보 API 사용
      // 여기서는 시뮬레이션
      const congestionLevel = Math.random() * 0.5; // 0-0.5 (낮은 혼잡도)

      return {
        congestionLevel,
        incidents: [],
        roadworks: [],
        averageSpeed: 60 * (1 - congestionLevel), // km/h
      };
    } catch (error) {
      logger.error('Traffic data error:', error);
      return {
        congestionLevel: 0,
        incidents: [],
        roadworks: [],
        averageSpeed: 60,
      };
    }
  }

  /**
   * AI 최적화 적용
   * 실제로는 TensorFlow/PyTorch 모델 사용
   */
  private async applyAIOptimization(
    fastestRoute: any,
    shortestRoute: any,
    trafficData: TrafficData,
    options: RouteOptions
  ): Promise<any> {
    // AI 모델 점수 계산 (실제로는 학습된 모델 사용)
    const fastestScore = this.calculateRouteScore(fastestRoute, trafficData, 'fastest');
    const shortestScore = this.calculateRouteScore(shortestRoute, trafficData, 'shortest');

    // 모드에 따른 가중치 조정
    let bestRoute;
    switch (options.mode) {
      case 'fastest':
        bestRoute = fastestRoute;
        break;
      case 'shortest':
        bestRoute = shortestRoute;
        break;
      case 'eco':
        // 연료 효율을 고려한 경로 (속도와 거리의 균형)
        bestRoute = fastestScore > shortestScore ? fastestRoute : shortestRoute;
        break;
      case 'ai-recommended':
      default:
        // AI가 선택한 최적 경로
        bestRoute = fastestScore > shortestScore ? fastestRoute : shortestRoute;
        break;
    }

    return bestRoute;
  }

  /**
   * 경로 점수 계산
   */
  private calculateRouteScore(
    route: any,
    trafficData: TrafficData,
    type: string
  ): number {
    // 거리, 시간, 교통 상황을 고려한 점수
    const distanceWeight = 0.3;
    const timeWeight = 0.5;
    const trafficWeight = 0.2;

    const normalizedDistance = 1 / (route.distance / 1000); // km
    const normalizedTime = 1 / (route.duration / 60); // minutes
    const trafficScore = 1 - trafficData.congestionLevel;

    return (
      normalizedDistance * distanceWeight +
      normalizedTime * timeWeight +
      trafficScore * trafficWeight
    );
  }

  /**
   * ETA 예측 (AI 기반)
   */
  private async predictETA(
    route: any,
    trafficData: TrafficData
  ): Promise<Date> {
    // 기본 시간에 교통 상황 반영
    const baseTime = route.duration; // seconds
    const trafficFactor = 1 + (trafficData.congestionLevel * 0.5);
    const predictedTime = baseTime * trafficFactor;

    // 과거 데이터 기반 조정 (실제로는 ML 모델 사용)
    const historicalFactor = await this.getHistoricalFactor();
    const finalTime = predictedTime * historicalFactor;

    const eta = new Date();
    eta.setSeconds(eta.getSeconds() + finalTime);

    return eta;
  }

  /**
   * 과거 데이터 기반 보정 계수
   */
  private async getHistoricalFactor(): Promise<number> {
    // 시간대별, 요일별 과거 데이터 분석
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // 출퇴근 시간대 보정
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return 1.3; // 30% 더 걸림
    }

    // 주말 보정
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 0.9; // 10% 빠름
    }

    return 1.0; // 기본
  }

  /**
   * 예측 신뢰도 계산
   */
  private calculateConfidence(
    route: any,
    trafficData: TrafficData
  ): number {
    // 교통 데이터 품질, 과거 정확도 등을 고려
    const baseConfidence = 0.85;
    const trafficDataQuality = 1 - trafficData.congestionLevel * 0.3;

    return Math.min(baseConfidence * trafficDataQuality, 0.99);
  }

  /**
   * Google Maps 응답 파싱
   */
  private parseGoogleRoute(route: any): any {
    const leg = route.legs[0];

    return {
      distance: leg.distance.value,
      duration: leg.duration.value,
      polyline: this.decodePolyline(route.overview_polyline.points),
      instructions: leg.steps.map((step: any) => ({
        instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
        distance: step.distance.value,
        duration: step.duration.value,
        maneuver: step.maneuver,
      })),
    };
  }

  /**
   * Polyline 디코딩
   */
  private decodePolyline(encoded: string): Location[] {
    const points: Location[] = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);

      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  }

  /**
   * 캐시 키 생성
   */
  private getCacheKey(
    origin: Location,
    destination: Location,
    options: RouteOptions
  ): string {
    return `route:${origin.latitude},${origin.longitude}:${destination.latitude},${destination.longitude}:${options.mode}`;
  }

  /**
   * 캐시에서 가져오기
   */
  private async getFromCache(key: string): Promise<RouteResult | null> {
    try {
      const cached = await redisClient.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * 캐시에 저장
   */
  private async saveToCache(key: string, data: RouteResult): Promise<void> {
    try {
      await redisClient.setex(key, this.CACHE_TTL, JSON.stringify(data));
    } catch (error) {
      logger.error('Cache save error:', error);
    }
  }
}

export default new AIRouteService();
