/**
 * @개요 거울 모드 섹션 컴포넌트입니다. 웹캠을 통한 수어 연습 기능을 제공합니다.
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-01-21
 * @최종수정일 2025-01-21
 * @매개변수 {object} props.word - 연습할 단어 정보입니다.
 * @반환값 {JSX.Element} 거울 모드 섹션 컴포넌트를 반환합니다.
 */

import { useState } from 'react';
import useWebcam from '../../hooks/useWebcam';
import styles from './MirrorModeSection.module.scss';

const MirrorModeSection = ({ word }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const {
    isWebcamOn,
    error: webcamError,
    startWebcam,
    stopWebcam,
    videoRef: webcamRef
  } = useWebcam();

  // 거울 모드 펼치기/접기
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && !isWebcamOn) {
      // 펼칠 때 웹캠이 꺼져있으면 자동으로 켜기
      handleWebcamToggle();
    }
  };

  // 웹캠 토글
  const handleWebcamToggle = async () => {
    if (isWebcamOn) {
      stopWebcam();
    } else {
      await startWebcam();
    }
  };



  return (
    <div className={styles.mirrorModeSection}>
      {/* 펼치기 바 */}
      <button 
        className={styles.mirrorModeToggle}
        onClick={toggleExpanded}
      >
        <span>거울 모드로 연습하기</span>
        <span className={`${styles.toggleIcon} ${isExpanded ? styles.expanded : ''}`}>
          ▼
        </span>
      </button>

      {/* 펼쳐진 콘텐츠 */}
      {isExpanded && (
        <div className={styles.mirrorModeContent}>
          {/* 웹캠 상태 및 제어 */}
          <div className={styles.webcamControls}>
            <div className={styles.webcamStatus}>
              <span className={`${styles.statusDot} ${isWebcamOn ? styles.on : styles.off}`}></span>
              <span className={styles.statusText}>
                {isWebcamOn ? 'CAM ON' : 'CAM OFF'}
              </span>
            </div>

            <button 
              className={`${styles.webcamButton} ${isWebcamOn ? styles.turnOff : styles.turnOn}`}
              onClick={handleWebcamToggle}
            >
              {isWebcamOn ? '웹캠 끄기' : '웹캠 켜기'}
            </button>
          </div>

          {/* 웹캠 필수 툴팁 */}
          {!isWebcamOn && (
            <div className={styles.webcamRequiredTooltip}>
              웹캠이 필요합니다!
            </div>
          )}

          {/* 웹캠 에러 메시지 */}
          {webcamError && (
            <div className={styles.webcamError}>
              {webcamError}
            </div>
          )}

          {/* 웹캠 화면 */}
          {isWebcamOn && (
            <div className={styles.webcamContainer}>
              <video
                ref={webcamRef}
                className={styles.webcamVideo}
                autoPlay
                playsInline
                muted
              />
            </div>
          )}

          {/* 연습 안내 */}
          <div className={styles.practiceGuide}>
            <h4>연습 방법</h4>
            <ul>
              <li>웹캠을 켜고 화면에 나타나는 자신의 모습을 확인하세요</li>
              <li>참고 영상을 보며 동일한 수어 동작을 따라해보세요</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default MirrorModeSection;