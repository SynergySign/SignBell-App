/**
 * @개요 대기방 헤더 컴포넌트 (방 정보 + 나가기 버튼)
 * @작성자 강관주
 * @작성일 2025-10-24
 */

import styles from '../../pages/quiz/QuizWaitingRoom.module.scss';

const WaitingRoomHeader = ({ roomInfo, roomId, onExit }) => {
  return (
    <div className={styles.roomInfoSection}>
      <div className={styles.roomInfo}>
        <span className={styles.roomNumber}>방 번호: #{roomInfo.gameRoomId || roomId}</span>
        <h2 className={styles.roomTitle}>{roomInfo.gameTitle || '방 제목'}</h2>
      </div>
      <button className={styles.exitButton} onClick={onExit}>
        나가기
      </button>
    </div>
  );
};

export default WaitingRoomHeader;
