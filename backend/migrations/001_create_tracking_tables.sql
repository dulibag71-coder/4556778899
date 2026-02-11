-- AI Navigator 차량 추적 데이터베이스 스키마
-- PostgreSQL + PostGIS

-- PostGIS 확장 활성화
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'user', -- user, admin, fleet_manager
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 차량 테이블
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vehicle_number VARCHAR(20) NOT NULL,
    model VARCHAR(100),
    year INTEGER,
    color VARCHAR(50),
    vin VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vehicle_number)
);

-- 실시간 위치 테이블 (최신 위치만 저장)
CREATE TABLE IF NOT EXISTS vehicle_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL, -- PostGIS 지리 타입
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION,
    speed DOUBLE PRECISION, -- km/h
    heading DOUBLE PRECISION, -- 방향 (0-360도)
    accuracy DOUBLE PRECISION, -- 정확도 (미터)
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vehicle_id)
);

-- 위치 히스토리 테이블 (모든 위치 기록)
CREATE TABLE IF NOT EXISTS location_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    altitude DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    accuracy DOUBLE PRECISION,
    battery_level INTEGER, -- 배터리 잔량 (%)
    is_charging BOOLEAN,
    recorded_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 파티션 인덱스 (날짜별로 파티션 가능)
CREATE INDEX idx_location_history_vehicle_time
ON location_history(vehicle_id, recorded_at DESC);

CREATE INDEX idx_location_history_location
ON location_history USING GIST(location);

-- 지오펜스 테이블
CREATE TABLE IF NOT EXISTS geofences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    area GEOGRAPHY(POLYGON, 4326) NOT NULL, -- 다각형 영역
    radius DOUBLE PRECISION, -- 반경 (미터, 원형 지오펜스용)
    center_lat DOUBLE PRECISION,
    center_lng DOUBLE PRECISION,
    type VARCHAR(20) DEFAULT 'circular', -- circular, polygon
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_geofences_area ON geofences USING GIST(area);

-- 지오펜스 이벤트 테이블
CREATE TABLE IF NOT EXISTS geofence_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    geofence_id UUID REFERENCES geofences(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL, -- enter, exit
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_geofence_events_vehicle ON geofence_events(vehicle_id, occurred_at DESC);

-- 알림 테이블
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- speeding, geofence_exit, low_battery, etc.
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'info', -- info, warning, critical
    is_read BOOLEAN DEFAULT false,
    metadata JSONB, -- 추가 데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_user ON alerts(user_id, created_at DESC);

-- 주행 세션 테이블
CREATE TABLE IF NOT EXISTS driving_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    start_location GEOGRAPHY(POINT, 4326),
    end_location GEOGRAPHY(POINT, 4326),
    distance DOUBLE PRECISION, -- 총 거리 (km)
    duration INTEGER, -- 총 시간 (초)
    average_speed DOUBLE PRECISION, -- 평균 속도
    max_speed DOUBLE PRECISION, -- 최고 속도
    route GEOGRAPHY(LINESTRING, 4326), -- 경로 라인
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_driving_sessions_vehicle ON driving_sessions(vehicle_id, start_time DESC);

-- 통계 테이블 (일별 집계)
CREATE TABLE IF NOT EXISTS daily_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_distance DOUBLE PRECISION,
    total_duration INTEGER,
    average_speed DOUBLE PRECISION,
    max_speed DOUBLE PRECISION,
    trip_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vehicle_id, date)
);

-- 공유 설정 테이블
CREATE TABLE IF NOT EXISTS vehicle_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    shared_with_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) DEFAULT 'view', -- view, track, manage
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vehicle_id, shared_with_user_id)
);

-- 함수: 두 지점 간 거리 계산 (미터)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
BEGIN
    RETURN ST_Distance(
        ST_MakePoint(lon1, lat1)::geography,
        ST_MakePoint(lon2, lat2)::geography
    );
END;
$$ LANGUAGE plpgsql;

-- 함수: 차량이 지오펜스 안에 있는지 확인
CREATE OR REPLACE FUNCTION is_in_geofence(
    vehicle_lat DOUBLE PRECISION,
    vehicle_lng DOUBLE PRECISION,
    geofence_id_param UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    geofence_area GEOGRAPHY;
BEGIN
    SELECT area INTO geofence_area
    FROM geofences
    WHERE id = geofence_id_param AND is_active = true;

    IF geofence_area IS NULL THEN
        RETURN false;
    END IF;

    RETURN ST_Contains(
        geofence_area::geometry,
        ST_SetSRID(ST_MakePoint(vehicle_lng, vehicle_lat), 4326)::geometry
    );
END;
$$ LANGUAGE plpgsql;

-- 트리거: 위치 업데이트 시 자동으로 히스토리 저장
CREATE OR REPLACE FUNCTION save_location_history()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO location_history (
        vehicle_id, location, latitude, longitude, altitude,
        speed, heading, accuracy, recorded_at
    )
    VALUES (
        NEW.vehicle_id, NEW.location, NEW.latitude, NEW.longitude,
        NEW.altitude, NEW.speed, NEW.heading, NEW.accuracy, NEW.timestamp
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_save_location_history
AFTER INSERT OR UPDATE ON vehicle_locations
FOR EACH ROW
EXECUTE FUNCTION save_location_history();

-- 샘플 데이터 (테스트용)
INSERT INTO users (email, password_hash, name, role) VALUES
('admin@ainavigator.com', '$2a$10$demo', '관리자', 'admin'),
('test@example.com', '$2a$10$demo', '테스트 사용자', 'user')
ON CONFLICT (email) DO NOTHING;

-- 인덱스 최적화
CREATE INDEX idx_vehicles_user ON vehicles(user_id);
CREATE INDEX idx_vehicles_active ON vehicles(is_active) WHERE is_active = true;
CREATE INDEX idx_vehicle_locations_vehicle ON vehicle_locations(vehicle_id);
CREATE INDEX idx_vehicle_locations_time ON vehicle_locations(timestamp DESC);
CREATE INDEX idx_vehicle_locations_location ON vehicle_locations USING GIST(location);

-- 뷰: 차량 최신 위치 + 정보
CREATE OR REPLACE VIEW v_vehicles_with_location AS
SELECT
    v.id,
    v.vehicle_number,
    v.model,
    v.year,
    v.user_id,
    u.name as owner_name,
    u.email as owner_email,
    vl.latitude,
    vl.longitude,
    vl.speed,
    vl.heading,
    vl.timestamp as last_seen,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - vl.timestamp)) as seconds_ago
FROM vehicles v
LEFT JOIN vehicle_locations vl ON v.id = vl.vehicle_id
LEFT JOIN users u ON v.user_id = u.id
WHERE v.is_active = true;

COMMENT ON TABLE vehicles IS '차량 정보';
COMMENT ON TABLE vehicle_locations IS '실시간 차량 위치 (최신 위치만)';
COMMENT ON TABLE location_history IS '차량 위치 이동 기록';
COMMENT ON TABLE geofences IS '지오펜스 (가상 경계선)';
COMMENT ON TABLE alerts IS '사용자 알림';
COMMENT ON TABLE driving_sessions IS '주행 세션 (출발~도착)';
