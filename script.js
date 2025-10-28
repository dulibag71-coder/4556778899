/**
 * AI Navigator - 메인 JavaScript
 * 화면 전환, 지도 연동, AI 경로 계산 등의 기능 구현
 */

// ==========================================
// 전역 변수 및 초기화
// ==========================================

let map = null;
let mapPreview = null;
let currentMarker = null;
let routePolyline = null;
let currentSpeed = 0;
let followMode = false;
let currentPosition = { lat: 37.5665, lng: 126.9780 }; // 서울 기본 좌표

// ==========================================
// 화면 전환 함수
// ==========================================

function navigateToScreen(targetScreenId) {
    const screens = document.querySelectorAll('.screen');
    const targetScreen = document.getElementById(targetScreenId);

    screens.forEach(screen => {
        if (screen.classList.contains('active')) {
            screen.classList.remove('active');
            screen.classList.add('exit-left');
            setTimeout(() => {
                screen.classList.remove('exit-left');
            }, 300);
        }
    });

    setTimeout(() => {
        targetScreen.classList.add('active');
    }, 50);
}

// ==========================================
// 지도 초기화
// ==========================================

function initMap() {
    if (!map) {
        map = L.map('map').setView([currentPosition.lat, currentPosition.lng], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19
        }).addTo(map);

        // 현재 위치 마커
        currentMarker = L.marker([currentPosition.lat, currentPosition.lng], {
            icon: L.divIcon({
                className: 'current-location-marker',
                html: '<div style="width: 20px; height: 20px; background: #2196F3; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                iconSize: [20, 20]
            })
        }).addTo(map);

        // 위치 정확도 원
        L.circle([currentPosition.lat, currentPosition.lng], {
            radius: 50,
            color: '#2196F3',
            fillColor: '#2196F3',
            fillOpacity: 0.1,
            weight: 1
        }).addTo(map);
    }

    // 지도 크기 재조정
    setTimeout(() => {
        if (map) map.invalidateSize();
    }, 300);
}

// 미리보기 지도 초기화
function initMapPreview() {
    if (!mapPreview) {
        mapPreview = L.map('map-preview').setView([currentPosition.lat, currentPosition.lng], 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap',
            maxZoom: 19
        }).addTo(mapPreview);

        // 출발지 마커
        L.marker([currentPosition.lat, currentPosition.lng], {
            icon: L.divIcon({
                className: 'start-marker',
                html: '<div style="width: 30px; height: 30px; background: #4CAF50; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                iconSize: [30, 30]
            })
        }).addTo(mapPreview);
    }

    setTimeout(() => {
        if (mapPreview) mapPreview.invalidateSize();
    }, 300);
}

// ==========================================
// 차량번호 입력 포맷팅
// ==========================================

const vehicleNumberInput = document.getElementById('vehicle-number');
vehicleNumberInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^0-9가-힣]/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    e.target.value = value;
});

// ==========================================
// 화면 1: 시작 화면 이벤트
// ==========================================

document.getElementById('btn-enter-vehicle').addEventListener('click', () => {
    const vehicleNumber = vehicleNumberInput.value.trim();

    if (vehicleNumber.length === 0) {
        alert('차량번호를 입력해주세요.');
        return;
    }

    // 차량번호 저장 및 표시
    document.querySelector('.vehicle-number-display').textContent = vehicleNumber;

    // 지도 화면으로 전환
    navigateToScreen('screen-map');
    initMap();

    // GPS 시뮬레이션 시작
    startGPSSimulation();
});

document.getElementById('btn-select-vehicle').addEventListener('click', () => {
    // 기본 차량번호 설정
    const defaultVehicle = '12가3456';
    vehicleNumberInput.value = defaultVehicle;
    document.querySelector('.vehicle-number-display').textContent = defaultVehicle;

    navigateToScreen('screen-map');
    initMap();
    startGPSSimulation();
});

// ==========================================
// 화면 2: 지도 화면 이벤트
// ==========================================

document.getElementById('btn-back-to-splash').addEventListener('click', () => {
    navigateToScreen('screen-splash');
    stopGPSSimulation();
});

// 현재 위치로 이동
document.getElementById('btn-current-location').addEventListener('click', () => {
    if (map) {
        map.setView([currentPosition.lat, currentPosition.lng], 15, {
            animate: true,
            duration: 0.5
        });
    }
});

// 따라가기 모드 토글
const followToggle = document.getElementById('follow-toggle');
followToggle.addEventListener('change', (e) => {
    followMode = e.target.checked;
    if (followMode && map) {
        map.setView([currentPosition.lat, currentPosition.lng], 15);
    }
});

// 내비게이션 시작
document.getElementById('btn-start-navigation').addEventListener('click', () => {
    navigateToScreen('screen-navigation');
    initMapPreview();
});

// ==========================================
// 화면 3: 내비게이션 화면 이벤트
// ==========================================

document.getElementById('btn-back-to-map').addEventListener('click', () => {
    navigateToScreen('screen-map');
});

// 경로 옵션 선택
document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// AI 경로 계산
document.getElementById('btn-calculate-route').addEventListener('click', () => {
    const destination = document.getElementById('destination-location').value.trim();

    if (destination.length === 0) {
        alert('목적지를 입력해주세요.');
        return;
    }

    // 로딩 표시
    showLoading();

    // AI 계산 시뮬레이션 (2초)
    setTimeout(() => {
        hideLoading();

        // 목적지 임의 좌표 생성 (현재 위치에서 약간 떨어진 곳)
        const destLat = currentPosition.lat + (Math.random() - 0.5) * 0.05;
        const destLng = currentPosition.lng + (Math.random() - 0.5) * 0.05;

        // 경로 그리기
        if (routePolyline) {
            mapPreview.removeLayer(routePolyline);
        }

        const routeCoords = [
            [currentPosition.lat, currentPosition.lng],
            [(currentPosition.lat + destLat) / 2, (currentPosition.lng + destLng) / 2],
            [destLat, destLng]
        ];

        routePolyline = L.polyline(routeCoords, {
            color: '#2196F3',
            weight: 4,
            opacity: 0.7
        }).addTo(mapPreview);

        // 목적지 마커
        L.marker([destLat, destLng], {
            icon: L.divIcon({
                className: 'dest-marker',
                html: '<div style="width: 30px; height: 30px; background: #F44336; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                iconSize: [30, 30]
            })
        }).addTo(mapPreview);

        // 지도 중심 조정
        mapPreview.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });

        // 예상 거리 및 시간 계산
        const distance = (Math.random() * 10 + 5).toFixed(1);
        const time = Math.floor(Math.random() * 20 + 15);

        document.getElementById('estimated-distance').textContent = `${distance} km`;
        document.getElementById('estimated-time').textContent = `${time}분`;

        // 버튼 변경
        document.getElementById('btn-calculate-route').style.display = 'none';
        document.getElementById('btn-start-guidance').style.display = 'flex';
    }, 2000);
});

// 안내 시작
document.getElementById('btn-start-guidance').addEventListener('click', () => {
    // 시뮬레이션: 3초 후 도착
    showLoading();

    setTimeout(() => {
        hideLoading();
        navigateToScreen('screen-summary');
        stopGPSSimulation();

        // 통계 업데이트
        updateSummaryStats();
    }, 3000);
});

// ==========================================
// 화면 4: 결과 화면 이벤트
// ==========================================

document.getElementById('btn-restart').addEventListener('click', () => {
    // 내비게이션 화면 리셋
    document.getElementById('destination-location').value = '';
    document.getElementById('estimated-distance').textContent = '-';
    document.getElementById('estimated-time').textContent = '-';
    document.getElementById('btn-calculate-route').style.display = 'flex';
    document.getElementById('btn-start-guidance').style.display = 'none';

    if (routePolyline && mapPreview) {
        mapPreview.removeLayer(routePolyline);
    }

    navigateToScreen('screen-map');
    startGPSSimulation();
});

document.getElementById('btn-home').addEventListener('click', () => {
    navigateToScreen('screen-splash');
    vehicleNumberInput.value = '';

    // 모든 데이터 리셋
    document.getElementById('destination-location').value = '';
    document.getElementById('estimated-distance').textContent = '-';
    document.getElementById('estimated-time').textContent = '-';
    document.getElementById('btn-calculate-route').style.display = 'flex';
    document.getElementById('btn-start-guidance').style.display = 'none';
    followToggle.checked = false;
    followMode = false;
});

// ==========================================
// GPS 시뮬레이션
// ==========================================

let gpsInterval = null;

function startGPSSimulation() {
    stopGPSSimulation();

    gpsInterval = setInterval(() => {
        // 위치 약간 변경 (이동 시뮬레이션)
        currentPosition.lat += (Math.random() - 0.5) * 0.0001;
        currentPosition.lng += (Math.random() - 0.5) * 0.0001;

        // 속도 변경 (0~80 km/h)
        currentSpeed = Math.floor(Math.random() * 80);
        document.querySelector('.speed-value').textContent = currentSpeed;

        // 마커 위치 업데이트
        if (currentMarker && map) {
            currentMarker.setLatLng([currentPosition.lat, currentPosition.lng]);

            if (followMode) {
                map.setView([currentPosition.lat, currentPosition.lng], map.getZoom());
            }
        }
    }, 1000);
}

function stopGPSSimulation() {
    if (gpsInterval) {
        clearInterval(gpsInterval);
        gpsInterval = null;
    }
}

// ==========================================
// 로딩 오버레이
// ==========================================

function showLoading() {
    document.getElementById('loading-overlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.remove('active');
}

// ==========================================
// 통계 업데이트
// ==========================================

function updateSummaryStats() {
    const distance = (Math.random() * 20 + 10).toFixed(1);
    const time = Math.floor(Math.random() * 30 + 15);
    const avgSpeed = Math.floor(distance / (time / 60));
    const accuracy = Math.floor(Math.random() * 10 + 90);

    document.getElementById('total-distance').textContent = `${distance} km`;
    document.getElementById('total-time').textContent = `${time}분`;
    document.getElementById('avg-speed').textContent = `${avgSpeed} km/h`;
    document.getElementById('ai-accuracy').textContent = `${accuracy}%`;
}

// ==========================================
// 목적지 입력 자동완성 (시뮬레이션)
// ==========================================

const destinations = [
    '강남역',
    '홍대입구역',
    '명동',
    '잠실역',
    '여의도',
    '코엑스',
    '서울역',
    '광화문',
    '이태원',
    '신촌'
];

const destinationInput = document.getElementById('destination-location');
let datalistCreated = false;

destinationInput.addEventListener('focus', () => {
    if (!datalistCreated) {
        const datalist = document.createElement('datalist');
        datalist.id = 'destinations-list';
        destinations.forEach(dest => {
            const option = document.createElement('option');
            option.value = dest;
            datalist.appendChild(option);
        });
        document.body.appendChild(datalist);
        destinationInput.setAttribute('list', 'destinations-list');
        datalistCreated = true;
    }
});

// ==========================================
// 초기화
// ==========================================

window.addEventListener('load', () => {
    console.log('AI Navigator 초기화 완료');

    // 위치 정보 요청 (실제 GPS 사용 시)
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentPosition.lat = position.coords.latitude;
                currentPosition.lng = position.coords.longitude;
                console.log('현재 위치 가져오기 성공:', currentPosition);
            },
            (error) => {
                console.log('위치 정보를 가져올 수 없습니다. 기본 위치 사용:', currentPosition);
            }
        );
    }
});

// 화면 리사이즈 이벤트
window.addEventListener('resize', () => {
    if (map) map.invalidateSize();
    if (mapPreview) mapPreview.invalidateSize();
});
