/**
 * AI Navigator - 지도 화면 (상용화 버전)
 * 실시간 GPS 추적, 차량 위치 표시, 지도 인터랙션
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import SpeedDisplay from '../components/SpeedDisplay';
import FollowModeToggle from '../components/FollowModeToggle';
import { colors, spacing } from '../theme';

interface Location {
  latitude: number;
  longitude: number;
}

const MapScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { startTracking, stopTracking, currentLocation } = useLocation();

  const mapRef = useRef<MapView>(null);
  const [followMode, setFollowMode] = useState(true);
  const [speed, setSpeed] = useState(0);
  const [heading, setHeading] = useState(0);
  const [region, setRegion] = useState({
    latitude: 37.5665,
    longitude: 126.9780,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    // 위치 추적 시작
    startLocationTracking();

    return () => {
      // 컴포넌트 언마운트 시 추적 중지
      stopTracking();
    };
  }, []);

  useEffect(() => {
    // 위치 업데이트 시 지도 중심 이동 (따라가기 모드)
    if (followMode && currentLocation) {
      moveToCurrentLocation();
    }
  }, [currentLocation, followMode]);

  const startLocationTracking = async () => {
    try {
      // 위치 추적 시작
      const watchId = Geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed: currentSpeed, heading: currentHeading } = position.coords;

          // 상태 업데이트
          setRegion(prev => ({
            ...prev,
            latitude,
            longitude,
          }));

          // 속도 업데이트 (m/s를 km/h로 변환)
          setSpeed(currentSpeed ? Math.round(currentSpeed * 3.6) : 0);

          // 방향 업데이트
          if (currentHeading !== null && currentHeading !== undefined) {
            setHeading(currentHeading);
          }

          // Context 업데이트
          startTracking({ latitude, longitude });
        },
        (error) => {
          console.error('Location error:', error);
          Alert.alert('위치 오류', '위치 정보를 가져올 수 없습니다.');
        },
        {
          enableHighAccuracy: true,
          distanceFilter: 5, // 5m마다 업데이트
          interval: 1000, // 1초마다
          fastestInterval: 500,
          showLocationDialog: true,
          forceRequestLocation: true,
        }
      );

      // 컴포넌트 언마운트 시 watchId 정리를 위해 저장
      return () => {
        Geolocation.clearWatch(watchId);
      };
    } catch (error) {
      console.error('Location tracking error:', error);
    }
  };

  const moveToCurrentLocation = () => {
    if (mapRef.current && currentLocation) {
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }
  };

  const handleFollowModeToggle = (enabled: boolean) => {
    setFollowMode(enabled);
    if (enabled) {
      moveToCurrentLocation();
    }
  };

  const handleNavigationStart = () => {
    navigation.navigate('Navigation' as never);
  };

  const handleMyLocation = () => {
    setFollowMode(true);
    moveToCurrentLocation();
  };

  return (
    <View style={styles.container}>
      {/* 상단 바 */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text.dark} />
        </TouchableOpacity>

        <View style={styles.vehicleInfo}>
          <Text style={styles.vehicleNumber}>
            {user?.vehicle?.number || '차량 등록 필요'}
          </Text>
          <View style={styles.gpsIndicator}>
            <Icon name="map-marker-check" size={16} color={colors.success} />
            <Text style={styles.gpsText}>GPS</Text>
          </View>
        </View>

        <SpeedDisplay speed={speed} />
      </View>

      {/* 지도 */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsTraffic={true}
        rotateEnabled={true}
        pitchEnabled={true}
        onRegionChangeComplete={(newRegion) => {
          // 사용자가 수동으로 지도를 움직이면 따라가기 모드 해제
          if (followMode) {
            const distance = Math.sqrt(
              Math.pow(newRegion.latitude - region.latitude, 2) +
              Math.pow(newRegion.longitude - region.longitude, 2)
            );
            if (distance > 0.001) {
              setFollowMode(false);
            }
          }
        }}
      >
        {/* 현재 위치 커스텀 마커 */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={heading}
          >
            <View style={styles.currentLocationMarker}>
              <Icon name="navigation" size={32} color={colors.primary} />
            </View>
          </Marker>
        )}
      </MapView>

      {/* 현재 위치 버튼 */}
      <TouchableOpacity
        style={styles.myLocationButton}
        onPress={handleMyLocation}>
        <Icon name="crosshairs-gps" size={24} color={colors.primary} />
      </TouchableOpacity>

      {/* 하단 카드 */}
      <View style={styles.bottomCard}>
        <FollowModeToggle
          enabled={followMode}
          onToggle={handleFollowModeToggle}
        />

        <TouchableOpacity
          style={styles.navigationButton}
          onPress={handleNavigationStart}>
          <Icon name="navigation-variant" size={20} color={colors.white} />
          <Text style={styles.navigationButtonText}>내비게이션 시작</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.m,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    marginLeft: spacing.m,
  },
  vehicleNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.lightBlue,
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: 20,
  },
  gpsIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gpsText: {
    fontSize: 12,
    color: colors.success,
  },
  map: {
    flex: 1,
  },
  currentLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 220,
    right: spacing.m,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.l,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 16,
    gap: spacing.m,
  },
  navigationButton: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  navigationButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
});

export default MapScreen;
