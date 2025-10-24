/**
 * 메인 비디오 카드 컴포넌트
 * 현재 도전자의 비디오와 정보 표시
 */

import { useEffect, useRef } from 'react';
import styles from './MainVideoCard.module.scss';

const MainVideoCard = ({
  challengerInfo,
  stream,
  gamePhase,
  isWaitingResult
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={styles.mainCard}>
      <div className={styles.videoContainer}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={styles.video}
        />
        
        {isWaitingResult && (
          <div className={styles.overlay}>
            <div className={styles.spinner}></div>
            <p>분석 중...</p>
          </div>
        )}
      </div>

      <div className={styles.info}>
        <span className={styles.nickname}>{challengerInfo.nickname}</span>
        <span className={styles.score}>{challengerInfo.score}점</span>
      </div>

      {gamePhase === 'myTurn' && (
        <div className={styles.badge}>내 차례</div>
      )}
    </div>
  );
};

export default MainVideoCard;
