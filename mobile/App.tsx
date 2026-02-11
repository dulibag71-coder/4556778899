/**
 * AI Navigator - 메인 앱 엔트리포인트
 * 상용화 버전
 */

import React, { useEffect } from 'react';
import { StatusBar, PermissionsAndroid, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from 'react-query';
import messaging from '@react-native-firebase/messaging';
import analytics from '@react-native-firebase/analytics';

import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/contexts/AuthContext';
import { LocationProvider } from './src/contexts/LocationContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { requestLocationPermission } from './src/utils/permissions';

// React Query 클라이언트
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5분
      cacheTime: 10 * 60 * 1000, // 10분
    },
  },
});

const App = () => {
  useEffect(() => {
    // 앱 초기화
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // 권한 요청
      await requestLocationPermission();

      // 푸시 알림 권한 요청
      await requestNotificationPermission();

      // Firebase 초기화
      await initializeFirebase();

      // 백그라운드 메시지 핸들러 등록
      messaging().setBackgroundMessageHandler(async remoteMessage => {
        console.log('Background message:', remoteMessage);
      });

    } catch (error) {
      console.error('App initialization error:', error);
    }
  };

  const requestNotificationPermission = async () => {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Notification permission granted');

      // FCM 토큰 가져오기
      const token = await messaging().getToken();
      console.log('FCM Token:', token);

      // 서버에 토큰 등록 (추후 구현)
      // await registerFCMToken(token);
    }
  };

  const initializeFirebase = async () => {
    // 포그라운드 메시지 핸들러
    messaging().onMessage(async remoteMessage => {
      console.log('Foreground message:', remoteMessage);
      // 알림 표시 로직
    });

    // 앱 실행 로깅
    await analytics().logEvent('app_open', {
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <LocationProvider>
              <NavigationContainer>
                <StatusBar
                  barStyle="dark-content"
                  backgroundColor="#FFFFFF"
                />
                <RootNavigator />
              </NavigationContainer>
            </LocationProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
};

export default App;
