import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../supabase.js';

export default function ZoneSetup({ session, onComplete, isChange = false }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const [selectedPos, setSelectedPos] = useState(null);
  const [zoneName, setZoneName] = useState('');
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsError, setGpsError] = useState(null);

  // 지도 초기화
  useEffect(() => {
    if (mapInstance.current) return;

    // 기본 위치: 서울 시청
    const defaultLat = 37.5665;
    const defaultLng = 126.9780;

    const map = L.map(mapRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 16,
      zoomControl: false,
      attributionControl: false,
    });

    // CartoDB Positron: 깔끔한 무채색 2D 타일
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    // 줌 컨트롤 우하단
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstance.current = map;

    // 지도 클릭 이벤트
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      updateMarker(lat, lng);
      reverseGeocode(lat, lng);
    });

    // GPS 위치 가져오기
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.setView([latitude, longitude], 16);
          updateMarker(latitude, longitude);
          reverseGeocode(latitude, longitude);
          setGpsLoading(false);
        },
        (err) => {
          console.warn('GPS Error:', err.message);
          setGpsError('GPS를 사용할 수 없습니다. 지도에서 직접 선택해주세요.');
          setGpsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setGpsError('이 기기는 GPS를 지원하지 않습니다.');
      setGpsLoading(false);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // 마커 + 반경 원 업데이트
  const updateMarker = (lat, lng) => {
    const map = mapInstance.current;
    if (!map) return;

    // 기존 마커/원 제거
    if (markerRef.current) map.removeLayer(markerRef.current);
    if (circleRef.current) map.removeLayer(circleRef.current);

    // 커스텀 마커 아이콘
    const icon = L.divIcon({
      className: 'zone-marker',
      html: `<div class="zone-marker-pin"></div><div class="zone-marker-pulse"></div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    markerRef.current = L.marker([lat, lng], { icon }).addTo(map);

    // 반경 500m 원
    circleRef.current = L.circle([lat, lng], {
      radius: 500,
      color: '#000',
      fillColor: '#000',
      fillOpacity: 0.06,
      weight: 2,
      opacity: 0.3,
      dashArray: '8, 6',
    }).addTo(map);

    setSelectedPos({ lat, lng });
  };

  // 리버스 지오코딩 (Nominatim 무료)
  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=ko`
      );
      const data = await res.json();
      const addr = data.address;
      // 동네 이름 우선순위: 동 > 리 > 구 > 시
      const name = addr?.neighbourhood || addr?.quarter || addr?.suburb ||
                   addr?.village || addr?.town || addr?.city_district ||
                   addr?.city || data.display_name?.split(',')[0] || '알 수 없는 위치';
      setZoneName(name);
    } catch {
      setZoneName('위치 확인 중...');
    }
  };

  // 동네 설정 저장
  const handleConfirm = async () => {
    if (!selectedPos || !session?.user?.id) return;
    setLoading(true);

    try {
      const updateData = {
        home_zone_name: zoneName,
        home_zone_lat: selectedPos.lat,
        home_zone_lng: selectedPos.lng,
      };

      // 설정 변경인 경우 zone_change_count 증가
      if (isChange) {
        updateData.zone_change_count = 1;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', session.user.id);

      if (error) throw error;

      if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
      onComplete();
    } catch (err) {
      console.error('Zone save error:', err);
      alert('저장 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 현재 위치로 이동
  const handleRecenter = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapInstance.current?.setView([latitude, longitude], 16, { animate: true });
        updateMarker(latitude, longitude);
        reverseGeocode(latitude, longitude);
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="zone-setup">
      {/* 헤더 */}
      <div className="zone-setup-header">
        <div className="zone-setup-title">
          {isChange ? '동네 변경' : '내 동네 설정'}
        </div>
        <div className="zone-setup-subtitle">
          {isChange
            ? '변경은 1회만 가능합니다. 신중하게 선택해주세요.'
            : '지도를 탭하여 내 동네를 선택해주세요'}
        </div>
      </div>

      {/* 지도 */}
      <div className="zone-map-container">
        <div ref={mapRef} className="zone-map" />

        {/* GPS 로딩 */}
        {gpsLoading && (
          <div className="zone-map-overlay">
            <div className="zone-loading-spinner"></div>
            <span>GPS 위치를 찾는 중...</span>
          </div>
        )}

        {/* GPS 오류 */}
        {gpsError && !gpsLoading && (
          <div className="zone-gps-error">{gpsError}</div>
        )}

        {/* 현재위치 버튼 */}
        <button className="zone-recenter-btn" onClick={handleRecenter} aria-label="현재 위치">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
      </div>

      {/* 선택된 동네 정보 */}
      <div className="zone-info-card">
        {selectedPos ? (
          <>
            <div className="zone-info-name">{zoneName || '위치 확인 중...'}</div>
            <div className="zone-info-coords">
              {selectedPos.lat.toFixed(4)}, {selectedPos.lng.toFixed(4)}
            </div>
            <div className="zone-info-radius">반경 500m 구역</div>
          </>
        ) : (
          <div className="zone-info-empty">지도를 탭하여 위치를 선택하세요</div>
        )}
      </div>

      {/* 확인 버튼 */}
      <button
        className="zone-confirm-btn"
        onClick={handleConfirm}
        disabled={!selectedPos || loading}
      >
        {loading ? '저장 중...' : isChange ? '이 동네로 변경' : '이 동네로 설정'}
      </button>
    </div>
  );
}
