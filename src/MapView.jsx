import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// 맵박스 토큰 설정
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export default function MapView({ profile, stores }) {
  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const userMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastLocationRef = useRef(null); // [Persist] 마지막 위치 기록용
  const [isTracking, setIsTracking] = useState(false);

  // 시점 파라미터 최적화
  const CURVE_PITCH = 52.5;
  const CURVE_PADDING = { top: 350, bottom: 150 };
  const TARGET_ZOOM = 16.7;

  useEffect(() => {
    let isMounted = true;
    if (mapInstance.current || !profile) return;
    
    // 기본 위치: 동네 설정이 없으면 서울 시청
    const defaultLng = 126.9780;
    const defaultLat = 37.5665;

    // 초기 중심점 결정 (마지막 위치가 있다면 우선 사용)
    const initialLng = lastLocationRef.current ? lastLocationRef.current[0] : (profile.home_zone_lng ? Number(profile.home_zone_lng) : defaultLng);
    const initialLat = lastLocationRef.current ? lastLocationRef.current[1] : (profile.home_zone_lat ? Number(profile.home_zone_lat) : defaultLat);

    // CSS 트랜지션 도중(너비가 0일 때) 맵박스 WebGL 엔진이 초기화되며 충돌하는 것을 방지하기 위해 딜레이 추가
    const initTimer = setTimeout(() => {
      if (!isMounted || !mapContainerRef.current) return;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [initialLng, initialLat],
        zoom: TARGET_ZOOM,
        pitch: CURVE_PITCH,
        padding: CURVE_PADDING,
        bearing: 0,
        antialias: true,
        attributionControl: false
      });

      mapInstance.current = map;

    map.on('load', () => {
      setupBaseMapStyle(map);

      const vworldKey = import.meta.env.VITE_VWORLD_API_KEY || '61CE9A81-10DD-3737-8256-FBE0421AB070';
      
      map.addSource('vworld-base', {
        type: 'raster',
        tiles: [`https://api.vworld.kr/req/wmts/1.0.0/${vworldKey}/white/{z}/{y}/{x}.png`],
        tileSize: 256
      });
      map.addLayer({
        id: 'vworld-base-layer',
        type: 'raster',
        source: 'vworld-base',
        paint: { 'raster-opacity': 0.6, 'raster-saturation': -1.0 }
      }, 'road-simple');

      map.addSource('vworld-dynamic-buildings', {
        'type': 'geojson',
        'data': { 'type': 'FeatureCollection', 'features': [] }
      });

      map.addLayer({
        'id': 'mapbox-3d-buildings',
        'source': 'composite',
        'source-layer': 'building',
        'type': 'fill-extrusion',
        'minzoom': 15,
        'paint': {
          'fill-extrusion-color': '#ffffff',
          'fill-extrusion-height': ['coalesce', ['get', 'height'], 7],
          'fill-extrusion-base': ['coalesce', ['get', 'min_height'], 0],
          'fill-extrusion-opacity': 0.4,
          'fill-extrusion-vertical-gradient': true
        }
      });

      map.addLayer({
        'id': 'vworld-fill-extrusion',
        'type': 'fill-extrusion',
        'source': 'vworld-dynamic-buildings',
        'paint': {
          'fill-extrusion-color': '#ffffff',
          'fill-extrusion-height': ['coalesce', ['*', ['to-number', ['get', 'gro_flo_co'], 0], 3.8], 15],
          'fill-extrusion-opacity': 1.0,
          'fill-extrusion-vertical-gradient': true
        }
      });

      map.addLayer({
        'id': 'vworld-highlight-extrusion',
        'type': 'fill-extrusion',
        'source': 'vworld-dynamic-buildings',
        'paint': {
          'fill-extrusion-color': '#ff7e00',
          'fill-extrusion-height': ['coalesce', ['*', ['to-number', ['get', 'gro_flo_co'], 0], 3.8], 15],
          'fill-extrusion-opacity': 1.0,
          'fill-extrusion-vertical-gradient': true,
          'fill-extrusion-base': 0
        },
        'filter': ['==', ['get', 'bul_man_no'], '']
      });

      map.setFog({ 'range': [0.5, 12], 'color': '#ffffff', 'horizon-blend': 0.1 });

      // [핵심] 지도 로드 즉시 저장된 위치 혹은 베이스 위치에 마커 생성
      initUserMarker(map, initialLng, initialLat);
      
      renderStoreMarkers(map);
      startTracking(map);
      
      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['vworld-fill-extrusion'] });
        if (features.length > 0) {
          const buildingId = features[0].properties.bul_man_no;
          map.setFilter('vworld-highlight-extrusion', ['==', ['get', 'bul_man_no'], buildingId]);
        }
      });

      map.on('mouseenter', 'vworld-fill-extrusion', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'vworld-fill-extrusion', () => { map.getCanvas().style.cursor = ''; });

      map.on('moveend', () => fetchVworldBuildings(map, vworldKey));
      fetchVworldBuildings(map, vworldKey);

      map.flyTo({ center: [initialLng, initialLat], zoom: TARGET_ZOOM, pitch: CURVE_PITCH });
    });
    
    }, 500); // 500ms 지연: CSS 애니메이션(0.9s) 시작 후 컨테이너 너비가 확보될 시간을 줍니다.

    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      // [정리] 핵심: 지도가 사라질 때 마커 객체도 완전히 초기화하여 좀비 현상 방지
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [profile]);

  // [탭 전환/복귀 시 레이아웃 무너짐 방지]
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && mapInstance.current) {
        mapInstance.current.resize();
        // 무리한 마커 수동 조작 대신, 자연스러운 리액트 흐름에 맡깁니다.
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const initUserMarker = (map, lng, lat) => {
    if (userMarkerRef.current) return;
    const el = document.createElement('div');
    el.className = 'user-location-dot';
    el.style.zIndex = '5000';
    el.innerHTML = '<div class="user-dot-inner"></div><div class="user-dot-pulse"></div>';
    userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(map);
  };

  const startTracking = (map) => {
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      lastLocationRef.current = [longitude, latitude]; // 마지막 좌표 기록
      
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([longitude, latitude]);
      } else {
        initUserMarker(map, longitude, latitude);
      }
      setIsTracking(true);
    }, (err) => {
      console.warn('GPS 수신 오류:', err);
    }, { enableHighAccuracy: true });
  };

  const fetchVworldBuildings = async (map, key) => {
    if (map.getZoom() < 15) return;
    const bounds = map.getBounds();
    const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
    const url = `https://api.vworld.kr/req/wfs?service=WFS&version=1.0.0&request=GetFeature&typename=lt_c_spbd&key=${key}&outputFormat=application/json&srsName=EPSG:4326&bbox=${bbox}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.features && map.getSource('vworld-dynamic-buildings')) {
        map.getSource('vworld-dynamic-buildings').setData(data);
      }
    } catch (error) {
      console.error('Vworld WFS Fetch Error:', error);
    }
  };

  const setupBaseMapStyle = (map) => {
    if (map.getLayer('background')) map.setPaintProperty('background', 'background-color', '#ffffff');
    map.getStyle().layers.forEach(layer => {
      if (layer.type === 'symbol' || layer.id.includes('label')) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
      }
      if (layer.id.includes('road')) {
        map.setLayoutProperty(layer.id, 'visibility', 'visible');
        if (layer.type === 'line') {
          map.setPaintProperty(layer.id, 'line-color', '#dddddd');
          map.setPaintProperty(layer.id, 'line-opacity', 0.8);
        }
      } else if (['landuse', 'park', 'water', 'building'].some(id => layer.id.includes(id))) {
        map.setLayoutProperty(layer.id, 'visibility', 'none');
      }
    });
  };

  const renderStoreMarkers = (map) => {
    if (!stores) return;
    stores.forEach((store) => {
      // lat/lng 데이터가 없는 경우 마커 생성을 건너뜀 (NaN 오류 방지)
      if (!store.lat || !store.lng) return;
      const el = document.createElement('div');
      el.className = 'store-marker-dot';
      new mapboxgl.Marker(el).setLngLat([Number(store.lng), Number(store.lat)]).addTo(map);
    });
  };

  const handleRecenter = () => {
    if (!mapInstance.current) return;
    const target = userMarkerRef.current ? userMarkerRef.current.getLngLat() : [profile.home_zone_lng, profile.home_zone_lat];
    mapInstance.current.flyTo({ 
      center: target, 
      zoom: TARGET_ZOOM, 
      pitch: CURVE_PITCH, 
      bearing: 0, 
      padding: CURVE_PADDING, 
      speed: 1.5 
    });
  };

  return (
    <div className="map-view">
      <div ref={mapContainerRef} className="map-container" />
      <div className="map-floating-btns">
        <button className="map-float-btn active" onClick={handleRecenter}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></svg>
        </button>
      </div>
    </div>
  );
}
