/**
 * @개요 개별 방 카드 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @매개변수 {object} props.room - 방 정보 객체
 * @매개변수 {function} props.onClick - 방 클릭 핸들러
 * @반환값 {JSX.Element} 방 카드 컴포넌트
 */

import styles from './RoomCard.module.scss';

const RoomCard = ({ room, onClick }) => {

  // 상태별 스타일 및 텍스트
  const getStatusInfo = (status) => {
    switch(status) {
      case 'WAITING':
        return '대기 중';
      case 'IN_PROGRESS':
        return '진행 중';
      case 'FINISHED':
        return '종료';
      default:
        return '대기 중';
    }
  };

  return (
    <div className={styles.roomCard} onClick={() => onClick(room.gameRoomId)}>
      <span className={styles.roomNumber}>{room.gameRoomId}</span>
      <span className={`${styles.roomStatus} ${room.status === 'IN_PROGRESS' ? styles.inProgress : styles.waiting}`}>
        {getStatusInfo(room.status)}
      </span>
      <span className={styles.roomTitle}>{room.gameTitle}</span>
      <span className={styles.roomPlayers}>
        {room.currentParticipants}/{room.maxParticipants}
      </span>
    </div>
  );
};

export default RoomCard;
