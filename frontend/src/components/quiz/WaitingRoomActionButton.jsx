/**
 * @개요 대기방 준비/시작 버튼 컴포넌트
 * @작성자 강관주 (Kanggwanju)
 * @작성일 2025-10-26
 */

import styles from '../../pages/quiz/QuizWaitingRoom.module.scss';

const WaitingRoomActionButton = ({
  isHost,
  isReady,
  isWebcamOn,
  allReady,
  onAction
}) => {
  const isDisabled = !isWebcamOn || (isHost && !allReady);

  const getButtonText = () => {
    if (isHost) {
      return allReady ? 'START' : 'WAITING...';
    }
    return isReady ? 'READY' : 'NOT READY';
  };

  const getButtonClass = () => {
    let className = styles.actionButton;
    
    if (isHost) {
      className += ` ${styles.startButton}`;
    } else {
      className += isReady ? ` ${styles.readyActive}` : ` ${styles.readyInactive}`;
    }
    
    if (isDisabled) {
      className += ` ${styles.disabled}`;
    }
    
    return className;
  };

  return (
    <div className={styles.actionButtonContainer}>
      <button
        className={getButtonClass()}
        onClick={isDisabled ? undefined : onAction}
        disabled={isDisabled}
      >
        {getButtonText()}
      </button>

      {!isWebcamOn && (
        <div className={styles.webcamRequiredTooltip}>
          <span>웹캠을 켜야 {isHost ? '게임을 시작' : '준비'}할 수 있습니다</span>
        </div>
      )}
    </div>
  );
};

export default WaitingRoomActionButton;
