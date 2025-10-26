/**
 * @개요 대기방 디버그 패널 컴포넌트
 * @작성자 강관주 (Kanggwanju)
 * @작성일 2025-10-26
 */

import styles from '../../pages/quiz/QuizWaitingRoom.module.scss';

const WaitingRoomDebugPanel = ({
  isJanusConnected,
  remoteStreamsCount,
  isWebcamOn,
  isHost,
  onToggleHost,
  onToggleReady,
  onNavigateToGame,
}) => {
  return (
    <div className={styles.testButtons}>
      <div className={styles.janusStatus}>
        <span>Janus: {isJanusConnected ? '✅ 연결됨' : '❌ 연결 안됨'}</span>
        <span>원격 스트림: {remoteStreamsCount}개</span>
        <span>웹캠: {isWebcamOn ? '✅ ON' : '❌ OFF'}</span>
      </div>
      <button className={styles.testButton} onClick={onToggleHost}>
        {isHost ? '참여자로 전환' : '방장으로 전환'}
      </button>
      <button className={styles.testButton} onClick={onToggleReady}>
        준비 상태 토글
      </button>
      <button className={styles.testButton} onClick={onNavigateToGame}>
        게임 시작 (테스트)
      </button>
    </div>
  );
};

export default WaitingRoomDebugPanel;
