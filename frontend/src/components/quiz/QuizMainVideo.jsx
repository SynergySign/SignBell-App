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
}) => {
  const renderVideo = () => {
    if (gamePhase === 'myTurn') {
      return (
        <video
          ref={mainVideoRef}
          autoPlay
          playsInline
          muted
          className={styles.webcamVideo}
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
