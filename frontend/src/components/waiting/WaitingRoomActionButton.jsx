/**
 * @개요 대기방 준비/시작 버튼 컴포넌트
 * @작성자 강관주
 * @작성일 2025-10-24
 */

import styles from '../../pages/quiz/QuizWaitingRoom.module.scss';

const WaitingRoomActionButton = ({ 
  isHost, 
  isReady, 
  allReady, 
  isWebcamOn, 
  onAction 
}) => {
  const getButtonClass = () => {
    const classes = [styles.actionButton];
    
    if (isHost) {
      classes.push(styles.startButton);
    } else {
      classes.push(isReady ? styles.readyActive : styles.readyInactive);
    }
    
    if (!isWebcamOn || (isHost && !allReady)) {
      classes.push(styles.disabled);
    }
    
    return classes.join(' ');
  };

  const getButtonText = () => {
    if (isHost) {
      return allReady ? 'START' : 'WAITING...';
    }
    return isReady ? 'READY' : 'NOT READY';
  };

  const isDisabled = !isWebcamOn || (isHost && !allReady);

  return (
    <div className={styles.actionButtonContainer}>
      <button
        className={getButtonClass()}
        onClick={isWebcamOn ? onAction : undefined}
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
