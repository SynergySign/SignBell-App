import styles from '../../pages/quiz/QuizGamePage.module.scss';

/**
 * 퀴즈 헤더 컴포넌트
 */
const QuizHeader = ({ roomId, isWebcamOn, onToggleWebcam, onExit }) => {
  return (
    <div className={styles.roomInfoSection}>
      <div className={styles.roomInfo}>
        <span className={styles.roomNumber}>방 번호: #{roomId}</span>
        <h2 className={styles.roomTitle}>방 제목</h2>
      </div>
      <div className={styles.headerControls}>
        <button
          className={styles.webcamToggleHeader}
          onClick={onToggleWebcam}
        >
          {isWebcamOn ? '웹캠 끄기' : '웹캠 켜기'}
        </button>
        <button className={styles.exitButton} onClick={onExit}>
          나가기
        </button>
      </div>
    </div>
  );
};

export default QuizHeader;
