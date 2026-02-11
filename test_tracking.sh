#!/bin/bash

# AI Navigator 추적 시스템 테스트 스크립트

echo "=========================================="
echo "AI Navigator 추적 시스템 테스트"
echo "=========================================="

API_BASE="http://localhost:5000/api/v1"

# 색상
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. 헬스 체크
echo -e "\n${YELLOW}1. API 헬스 체크${NC}"
curl -s ${API_BASE%/api/v1}/health | jq .

# 2. 위치 업데이트
echo -e "\n${YELLOW}2. 위치 업데이트 테스트${NC}"
curl -s -X POST $API_BASE/tracking/update \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "test-vehicle-1",
    "latitude": 37.5665,
    "longitude": 126.9780,
    "speed": 45.5,
    "heading": 180,
    "accuracy": 10,
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
  }' | jq .

echo -e "${GREEN}✓ 위치 업데이트 성공${NC}"

# 3. 위치 조회
echo -e "\n${YELLOW}3. 위치 조회 테스트${NC}"
curl -s $API_BASE/tracking/location/test-vehicle-1 | jq .

# 4. 두 번째 차량 추가
echo -e "\n${YELLOW}4. 두 번째 차량 추가${NC}"
curl -s -X POST $API_BASE/tracking/update \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "test-vehicle-2",
    "latitude": 37.5565,
    "longitude": 126.9880,
    "speed": 30.0,
    "heading": 90
  }' | jq .

# 5. 여러 차량 조회
echo -e "\n${YELLOW}5. 여러 차량 위치 조회${NC}"
curl -s "$API_BASE/tracking/locations?vehicleIds=test-vehicle-1,test-vehicle-2" | jq .

# 6. 근처 차량 검색
echo -e "\n${YELLOW}6. 근처 차량 검색 (반경 5km)${NC}"
curl -s "$API_BASE/tracking/nearby?lat=37.5665&lng=126.9780&radius=5000" | jq .

# 7. 이동 시뮬레이션
echo -e "\n${YELLOW}7. 이동 시뮬레이션 (5회)${NC}"
for i in {1..5}; do
  LAT=$(echo "37.5665 + ($i * 0.001)" | bc -l)
  LNG=$(echo "126.9780 + ($i * 0.001)" | bc -l)
  SPEED=$(echo "$i * 10" | bc)

  echo "이동 $i: ($LAT, $LNG) @ ${SPEED}km/h"

  curl -s -X POST $API_BASE/tracking/update \
    -H "Content-Type: application/json" \
    -d '{
      "vehicleId": "test-vehicle-1",
      "latitude": '$LAT',
      "longitude": '$LNG',
      "speed": '$SPEED',
      "heading": 45
    }' > /dev/null

  sleep 2
done

echo -e "${GREEN}✓ 이동 시뮬레이션 완료${NC}"

# 8. 히스토리 조회
echo -e "\n${YELLOW}8. 위치 히스토리 조회${NC}"
curl -s "$API_BASE/tracking/history/test-vehicle-1?limit=10" | jq '.data | length'
echo "히스토리 개수 확인"

# 9. 경로 조회
echo -e "\n${YELLOW}9. 오늘 경로 조회${NC}"
TODAY=$(date +%Y-%m-%d)
curl -s "$API_BASE/tracking/route/test-vehicle-1?date=$TODAY" | jq '.data.points | length'

echo -e "\n${GREEN}=========================================="
echo -e "테스트 완료!"
echo -e "==========================================${NC}"
echo ""
echo "다음 URL에서 대시보드 확인:"
echo "  file://$(pwd)/dashboard.html"
echo ""
