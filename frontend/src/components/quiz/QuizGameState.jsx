import styles from '../../pages/quiz/QuizGamePage.module.scss';

/**
 * 게임 상태별 UI 컴포넌트
 */
const QuizGameState = ({
  gamePhase,
  timer,
  challengersCount,
  maxChallengers,
  hasChallenged,
  challengeOrder,
  onChallenge,
  currentChallengerInfo,
  solvingTimer,
  signingTimer,
  isWaitingResult,
  resultMessage,
}) => {
  // 도전 신청 단계
  if (gamePhase === 'challenge') {
    return (
      <div className={styles.gameStateSection}>
        <div className={styles.challengeSection}>
          <div className={`${styles.timerDisplay} ${timer <= 3 ? styles.urgent : ''}`}>
            <span className={styles.timerLabel}>남은 시간</span>
            <span className={styles.timerValue}>{timer}초</span>
          </div>

          <div className={styles.challengeInfo}>
            <span className={styles.challengeTooltip}>
              선착순으로 도전자를 받는중입니다.
            </span>
            <span className={styles.challengeCount}>
              {challengersCount}/{maxChallengers}
            </span>
          </div>

          <button
            className={`${styles.challengeButton} ${
              hasChallenged || challengersCount >= maxChallengers || timer === 0
                ? styles.disabled
                : styles.active
            }`}
            onClick={onChallenge}
            disabled={hasChallenged || challengersCount >= maxChallengers || timer === 0}
          >
            {hasChallenged
              ? `도전 신청 완료 (${challengeOrder}번째)`
              : '문제 도전하기'}
          </button>
        </div>
      </div>
    );
  }

  // 다른 사람 풀이 단계
  if (gamePhase === 'solving') {
    return (
      <div className={styles.gameStateSection}>
        <div className={styles.solvingPhase}>
          <div className={styles.solvingMessage}>
            <h2>{currentChallengerInfo.nickname}님이 문제를 풀고 있습니다...</h2>
            <p>잠시만 기다려주세요</p>
          </div>
        </div>
      </div>
    );
  }

  // 내 차례 단계
  if (gamePhase === 'myTurn') {
    return (
      <div className={styles.gameStateSection}>
        <div className={styles.myTurnPhase}>
          <div className={styles.countdownDisplay}>
            <h2>내 차례입니다!</h2>
            {isWaitingResult ? (
              <>
                <div className={styles.loadingSpinner}></div>
                <p className={styles.waitingText}>{resultMessage}</p>
                <p className={styles.waitingHint}>AI가 수어를 분석하고 있습니다</p>
              </>
            ) : solvingTimer > 0 ? (
              <>
                <p>수어 동작 준비하세요</p>
                <div
                  className={`${styles.countdownNumber} ${
                    solvingTimer <= 2 ? styles.urgent : ''
                  }`}
                >
                  {solvingTimer}
                </div>
                <p className={styles.prepareHint}>
                  카메라를 확인하고 자세를 준비하세요
                </p>
              </>
            ) : (
              <>
                <p className={styles.signingText}>지금 수어를 표현하세요!</p>
                <div className={styles.signingIndicator}>🤟</div>
                <div
                  className={`${styles.signingTimer} ${
                    signingTimer <= 3 ? styles.urgent : ''
                  }`}
                >
                  남은 시간: {signingTimer}초
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default QuizGameState;
