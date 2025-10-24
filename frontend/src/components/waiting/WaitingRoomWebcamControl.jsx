/**
 * @개요 대기방 웹캠 제어 컴포넌트
 * @작성자 강관주
 * @작성일 2025-10-24
 */

import styles from '../../pages/quiz/QuizWaitingRoom.module.scss';

const WaitingRoomWebcamControl = ({ 
  isWebcamOn, 
  webcamError, 
  onToggle 
}) => {
  const getWebcamStatusColor = (status) => {
    switch (status) {
      case 'on': return 'var(--info-color)';
      case 'off': return '#999999';
      case 'denied': return 'var(--error-color)';
      default: return '#999999';
    }
  };

  const getWebcamStatusText = (status) => {
    switch (status) {
      case 'on': return 'CAM ON';
      case 'off': return 'CAM OFF';
      case 'denied': return 'CAM DENIED';
      default: return 'CAM OFF';
    }
  };

  const status = isWebcamOn ? 'on' : webcamError ? 'denied' : 'off';

  return (
    <div className={styles.webcamControlSection}>
      <button
        className={styles.webcamControlButton}
        onClick={onToggle}
      >
        {isWebcamOn ? '웹캠 끄기' : '웹캠 켜기'}
      </button>
      <div className={styles.webcamStatus}>
        <div
          className={styles.webcamStatusDot}
          style={{ backgroundColor: getWebcamStatusColor(status) }}
        ></div>
        <span className={styles.webcamStatusText}>
          {getWebcamStatusText(status)}
        </span>
      </div>
    </div>
  );
};

export default WaitingRoomWebcamControl;
