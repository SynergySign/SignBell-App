/**
 * @개요 대기방 헤더 컴포넌트
 * @작성자 강관주 (Kanggwanju)
 * @작성일 2025-10-26
 */

import styles from '../../pages/quiz/QuizWaitingRoom.module.scss';

const WaitingRoomHeader = ({ roomId, roomTitle, onExit }) => {
  return (
    <div className={styles.roomInfoSection}>
      <div className={styles.roomInfo}>
        <span className={styles.roomNumber}>방 번호: #{roomId}</span>
        <h2 className={styles.roomTitle}>{roomTitle || '방 제목'}</h2>
      </div>
      <button className={styles.exitButton} onClick={onExit}>
        나가기
      </button>
    </div>
  );
};

export default WaitingRoomHeader;
