/**
 * 실시간 차량 추적 서비스
 * 백그라운드 GPS 추적 + API 전송
 */

import BackgroundGeolocation, {
  Location,
  State,
} from 'react-native-background-geolocation';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE = 'http://localhost:5000/api/v1';

class TrackingService {
  private isConfigured = false;
  private vehicleId: string | null = null;

  /**
   * 추적 서비스 초기화
   */
  async initialize(vehicleId: string): Promise<void> {
    this.vehicleId = vehicleId;

    if (this.isConfigured) {
      console.log('TrackingService already configured');
      return;
    }

    try {
      await BackgroundGeolocation.ready({
        // 디버그 설정
        debug: __DEV__,
        logLevel: BackgroundGeolocation.LOG_LEVEL_VERBOSE,

        // 위치 추적 설정
        desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
        distanceFilter: 10, // 10m마다 업데이트
        stationaryRadius: 25,
        locationUpdateInterval: 5000, // 5초
        fastestLocationUpdateInterval: 1000,

        // 백그라운드 모드
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,

        // 배터리 최적화
        stopTimeout: 5, // 5분 정지 후 추적 중단
        activityType: BackgroundGeolocation.ACTIVITY_TYPE_AUTOMOTIVE_NAVIGATION,
        preventSuspend: true,

        // HTTP 설정 (자동 전송)
        url: `${API_BASE}/tracking/update`,
        httpRootProperty: '.',
        locationTemplate: JSON.stringify({
          vehicleId: '{{vehicleId}}',
          latitude: '{{latitude}}',
          longitude: '{{longitude}}',
          speed: '{{speed}}',
          heading: '{{heading}}',
          altitude: '{{altitude}}',
          accuracy: '{{accuracy}}',
          timestamp: '{{timestamp}}',
        }),
        params: {
          vehicleId: this.vehicleId,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        autoSync: true,
        autoSyncThreshold: 5, // 5개 위치 쌓이면 자동 전송
        batchSync: true,
        maxBatchSize: 50,

        // 알림 설정
        notification: {
          title: 'AI Navigator',
          text: '차량 위치 추적 중',
          color: '#2196F3',
          channelName: 'Location Tracking',
          ...(Platform.OS === 'android' && {
            priority: BackgroundGeolocation.NOTIFICATION_PRIORITY_LOW,
            sticky: false,
          }),
        },

        // iOS 설정
        ...(Platform.OS === 'ios' && {
          showsBackgroundLocationIndicator: true,
        }),
      });

      // 이벤트 리스너 등록
      this.setupListeners();

      this.isConfigured = true;
      console.log('TrackingService initialized');
    } catch (error) {
      console.error('TrackingService initialization error:', error);
      throw error;
    }
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupListeners(): void {
    // 위치 업데이트
    BackgroundGeolocation.onLocation(
      (location: Location) => {
        console.log('[Location]', location);
        this.sendLocationUpdate(location);
      },
      (error) => {
        console.error('[Location] ERROR:', error);
      }
    );

    // 이동 감지
    BackgroundGeolocation.onMotionChange((event) => {
      console.log('[MotionChange]', event.isMoving, event.location);
    });

    // 액티비티 변경 (운전, 정지, 도보 등)
    BackgroundGeolocation.onActivityChange((event) => {
      console.log('[ActivityChange]', event.activity, event.confidence);
    });

    // HTTP 성공
    BackgroundGeolocation.onHttp((response) => {
      console.log('[HTTP] Success:', response.status);
    });

    // HTTP 실패
    BackgroundGeolocation.onHttpFailure((response) => {
      console.error('[HTTP] Failure:', response.status, response.responseText);
    });

    // 상태 변경
    BackgroundGeolocation.onProviderChange((event) => {
      console.log('[Provider]', event);
    });
  }

  /**
   * 추적 시작
   */
  async start(): Promise<void> {
    try {
      const state: State = await BackgroundGeolocation.start();
      console.log('[TrackingService] Started:', state.enabled);

      await AsyncStorage.setItem('tracking_enabled', 'true');
      await AsyncStorage.setItem('tracking_vehicle_id', this.vehicleId || '');

      return;
    } catch (error) {
      console.error('[TrackingService] Start error:', error);
      throw error;
    }
  }

  /**
   * 추적 중지
   */
  async stop(): Promise<void> {
    try {
      const state: State = await BackgroundGeolocation.stop();
      console.log('[TrackingService] Stopped:', state.enabled);

      await AsyncStorage.setItem('tracking_enabled', 'false');

      return;
    } catch (error) {
      console.error('[TrackingService] Stop error:', error);
      throw error;
    }
  }

  /**
   * 현재 위치 가져오기
   */
  async getCurrentLocation(): Promise<Location> {
    try {
      const location = await BackgroundGeolocation.getCurrentPosition({
        timeout: 30,
        maximumAge: 5000,
        desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
        samples: 1,
      });

      console.log('[CurrentPosition]', location);
      return location;
    } catch (error) {
      console.error('[CurrentPosition] Error:', error);
      throw error;
    }
  }

  /**
   * 위치 업데이트 전송 (수동)
   */
  private async sendLocationUpdate(location: Location): Promise<void> {
    if (!this.vehicleId) {
      console.warn('Vehicle ID not set');
      return;
    }

    try {
      const data = {
        vehicleId: this.vehicleId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        altitude: location.coords.altitude,
        speed: location.coords.speed ? location.coords.speed * 3.6 : 0, // m/s to km/h
        heading: location.coords.heading,
        accuracy: location.coords.accuracy,
        timestamp: location.timestamp,
      };

      // API 호출 (백그라운드에서는 자동 전송되지만, 추가 로직용)
      await axios.post(`${API_BASE}/tracking/update`, data);
      console.log('[API] Location sent successfully');
    } catch (error) {
      console.error('[API] Send location error:', error);
      // 실패해도 계속 진행 (자동 재시도됨)
    }
  }

  /**
   * 추적 상태 확인
   */
  async getState(): Promise<State> {
    return await BackgroundGeolocation.getState();
  }

  /**
   * 위치 히스토리 가져오기 (로컬 저장소)
   */
  async getLocations(): Promise<Location[]> {
    return await BackgroundGeolocation.getLocations();
  }

  /**
   * 로컬 위치 데이터 삭제
   */
  async destroyLocations(): Promise<void> {
    await BackgroundGeolocation.destroyLocations();
  }

  /**
   * 설정 변경
   */
  async changePace(isMoving: boolean): Promise<void> {
    await BackgroundGeolocation.changePace(isMoving);
  }

  /**
   * 지오펜스 추가
   */
  async addGeofence(geofence: {
    identifier: string;
    latitude: number;
    longitude: number;
    radius: number;
    notifyOnEntry?: boolean;
    notifyOnExit?: boolean;
  }): Promise<void> {
    await BackgroundGeolocation.addGeofence({
      identifier: geofence.identifier,
      radius: geofence.radius,
      latitude: geofence.latitude,
      longitude: geofence.longitude,
      notifyOnEntry: geofence.notifyOnEntry ?? true,
      notifyOnExit: geofence.notifyOnExit ?? true,
      notifyOnDwell: false,
    });

    console.log('[Geofence] Added:', geofence.identifier);
  }

  /**
   * 지오펜스 제거
   */
  async removeGeofence(identifier: string): Promise<void> {
    await BackgroundGeolocation.removeGeofence(identifier);
    console.log('[Geofence] Removed:', identifier);
  }

  /**
   * 모든 지오펜스 제거
   */
  async removeGeofences(): Promise<void> {
    await BackgroundGeolocation.removeGeofences();
  }

  /**
   * 서비스 정리
   */
  async cleanup(): Promise<void> {
    await this.stop();
    await this.removeGeofences();
    BackgroundGeolocation.removeListeners();
    this.isConfigured = false;
  }
}

// 싱글톤 인스턴스
export default new TrackingService();
