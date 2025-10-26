import { useEffect } from 'react';
import styles from '../../pages/quiz/QuizGamePage.module.scss';

/**
 * 메인 비디오 카드 컴포넌트
 */
const QuizMainVideo = ({
  gamePhase,
  isWebcamOn,
  mainVideoRef,
  currentChallengerInfo,
  remoteStreams,
  remoteVideosRef,
  stream,  // 내 스트림 추가
}) => {
  // 내 차례일 때 내 스트림 연결
  useEffect(() => {
    if (gamePhase === 'myTurn' && mainVideoRef.current && stream) {
      mainVideoRef.current.srcObject = stream;
    }
  }, [gamePhase, stream, mainVideoRef]);

  // 다른 사람 차례일 때 원격 스트림 연결
  useEffect(() => {
    if (
      gamePhase === 'solving' &&
      currentChallengerInfo.id &&
      remoteStreams[currentChallengerInfo.id]
    ) {
      const videoElement = remoteVideosRef.current[currentChallengerInfo.id];
      const remoteStream = remoteStreams[currentChallengerInfo.id];

      if (videoElement && remoteStream) {
        videoElement.srcObject = remoteStream;
      }
    }
  }, [gamePhase, currentChallengerInfo.id, remoteStreams, remoteVideosRef]);

  const renderVideo = () => {
    if (gamePhase === 'myTurn') {
      return (
        <video
          ref={mainVideoRef}
          autoPlay
          playsInline
          muted
          className={styles.webcamVideo}
          onError={(e) => console.error('비디오 오류:', e)}
        />
      );
    } else if (
      gamePhase === 'solving' &&
      currentChallengerInfo.id &&
      remoteStreams[currentChallengerInfo.id]
    ) {
      return (
        <video
          ref={el => {
            if (el) {
              remoteVideosRef.current[currentChallengerInfo.id] = el;
            }
          }}
          autoPlay
          playsInline
          className={styles.webcamVideo}
          onError={(e) => console.error('원격 비디오 오류:', e)}
        />
      );
    } else {
      return (
        <div className={styles.challengerWebcam}>
          <span>도전자 웹캠</span>
        </div>
      );
    }
  };

  return (
    <div className={styles.mainVideoCard}>
      {(gamePhase === 'myTurn' || gamePhase === 'solving') && (
        <div className={styles.mainChallengerBadge}>도전 중</div>
      )}
      <div className={styles.mainWebcam}>{renderVideo()}</div>
      <div className={styles.mainPlayerInfo}>
        <span className={styles.mainPlayerName}>
          {currentChallengerInfo?.nickname || '대기중'}
        </span>
        <span className={styles.mainPlayerScore}>
          {currentChallengerInfo?.score || 0}점
        </span>
      </div>
    </div>
  );
};

export default QuizMainVideo;
