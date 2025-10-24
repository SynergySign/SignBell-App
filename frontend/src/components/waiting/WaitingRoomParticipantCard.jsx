/**
 * @개요 대기방 참가자 카드 컴포넌트
 * @작성자 강관주
 * @작성일 2025-10-24
 */

import styles from '../../pages/quiz/QuizWaitingRoom.module.scss';

const WaitingRoomParticipantCard = ({ 
  participant, 
  myUserId,
  isWebcamOn,
  videoRef,
  remoteStreams,
  remoteVideosRef 
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

  return (
    <div className={styles.participantCard}>
      <div
        className={styles.camStatusDot}
        style={{ backgroundColor: getWebcamStatusColor(participant.webcamStatus) }}
        title={getWebcamStatusText(participant.webcamStatus)}
      ></div>

      {participant.isHost && (
        <span className={styles.hostBadge}>방장</span>
      )}

      <div className={styles.webcamArea}>
        {participant.userId === myUserId && isWebcamOn ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={styles.webcamVideo}
          />
        ) : remoteStreams[participant.userId] ? (
          <video
            ref={el => remoteVideosRef.current[participant.userId] = el}
            autoPlay
            playsInline
            className={styles.webcamVideo}
          />
        ) : (
          <div className={styles.webcamPlaceholder}>
            <span>웹캠</span>
          </div>
        )}
      </div>

      <div className={styles.participantInfo}>
        <span className={styles.nickname}>
          {participant.nickname}{participant.userId === myUserId ? ' (나)' : ''}
        </span>
        <span className={styles.score}>{participant.score}점</span>
      </div>

      {!participant.isHost && (
        <div
          className={`${styles.readyBadge} ${participant.isReady ? styles.ready : styles.notReady}`}
        >
          {participant.isReady ? 'READY' : 'NOT READY'}
        </div>
      )}
    </div>
  );
};

export default WaitingRoomParticipantCard;
