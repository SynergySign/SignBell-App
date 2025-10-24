/**
 * 게임 헤더 컴포넌트
 * 문제 번호, 단어, 타이머, 나가기 버튼
 */

import styles from './GameHeader.module.scss';

const GameHeader = ({
  currentQuestion,
  totalQuestions,
  currentWord,
  timer,
  gamePhase,
  solvingTimer,
  signingTimer,
  onExit
}) => {
  const getTimerDisplay = () => {
    if (gamePhase === 'challenge') {
      return `도전 신청: ${timer}초`;
    } else if (gamePhase === 'myTurn') {
      if (solvingTimer > 0) {
        return `준비: ${solvingTimer}초`;
      } else {
        return `수어 동작: ${signingTimer}초`;
      }
    } else if (gamePhase === 'solving') {
      return '다른 사람 차례';
    }
    return '';
  };

  return (
    <div className={styles.header}>
      <div className={styles.questionInfo}>
        <span className={styles.questionNumber}>
          문제 {currentQuestion} / {totalQuestions}
        </span>
        <span className={styles.word}>{currentWord}</span>
      </div>

      <div className={styles.timer}>
        {getTimerDisplay()}
      </div>

      <button className={styles.exitButton} onClick={onExit}>
        나가기
      </button>
    </div>
  );
};

export default GameHeader;
