import React, { useState } from 'react';
import ZoneSetup from './ZoneSetup.jsx';

export default function Settings({ session, profile, onProfileUpdate }) {
  const [showZoneChange, setShowZoneChange] = useState(false);

  const canChangeZone = profile?.zone_change_count === 0 || profile?.zone_change_count === null;

  if (showZoneChange) {
    return (
      <ZoneSetup
        session={session}
        isChange={true}
        onComplete={() => {
          setShowZoneChange(false);
          onProfileUpdate();
        }}
      />
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>설정</h2>
      </div>

      {/* 동네 설정 섹션 */}
      <div className="settings-section">
        <div className="settings-section-title">내 동네</div>

        <div className="settings-card">
          <div className="settings-zone-info">
            <div className="settings-zone-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className="settings-zone-detail">
              <div className="settings-zone-name">
                {profile?.home_zone_name || '설정되지 않음'}
              </div>
              {profile?.home_zone_lat && (
                <div className="settings-zone-coords">
                  {profile.home_zone_lat.toFixed(4)}, {profile.home_zone_lng.toFixed(4)}
                </div>
              )}
            </div>
          </div>

          {canChangeZone ? (
            <button
              className="settings-zone-change-btn"
              onClick={() => setShowZoneChange(true)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              동네 변경 (1회 가능)
            </button>
          ) : (
            <div className="settings-zone-locked">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              변경 횟수를 모두 사용했습니다
            </div>
          )}
        </div>
      </div>

      {/* 계정 섹션 */}
      <div className="settings-section">
        <div className="settings-section-title">계정</div>

        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-row-label">이름</span>
            <span className="settings-row-value">{profile?.name || '-'}</span>
          </div>
          <div className="settings-divider" />
          <div className="settings-row">
            <span className="settings-row-label">등급</span>
            <span className="settings-row-value">{profile?.sub_text || '-'}</span>
          </div>
          <div className="settings-divider" />
          <div className="settings-row">
            <span className="settings-row-label">포인트</span>
            <span className="settings-row-value">{profile?.points?.toLocaleString() || 0} CUP</span>
          </div>
        </div>
      </div>

      {/* 앱 정보 */}
      <div className="settings-section">
        <div className="settings-section-title">앱 정보</div>
        <div className="settings-card">
          <div className="settings-row">
            <span className="settings-row-label">버전</span>
            <span className="settings-row-value">1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
