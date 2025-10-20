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
  return (
    <div className={styles.roomCard} onClick={() => onClick(room.id)}>
      <span className={styles.roomNumber}>{room.id}</span>
      <span className={`${styles.roomStatus} ${room.status === '진행 중' ? styles.inProgress : styles.waiting}`}>
        {room.status}
      </span>
      <span className={styles.roomTitle}>{room.title}</span>
      <span className={styles.roomPlayers}>
        {room.currentPlayers}/{room.maxPlayers}
      </span>
    </div>
  );
};

export default RoomCard;
