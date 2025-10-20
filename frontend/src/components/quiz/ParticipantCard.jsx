/**
 * @개요 퀴즈 대기방 참여자 정보 카드 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @매개변수 {object} props.participant - 참여자 정보 객체
 * @매개변수 {boolean} props.isEmpty - 빈 자리 여부
 * @매개변수 {number} props.index - 카드 인덱스 (애니메이션 딜레이용)
 * @반환값 {JSX.Element} 참여자 카드 컴포넌트
 */

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCoins } from '@fortawesome/free-solid-svg-icons';
import styles from './ParticipantCard.module.scss';

const ParticipantCard = ({ participant, isEmpty = false, index = 0 }) => {
  if (isEmpty) {
    return (
      <div 
        className={`${styles.participantCard} ${styles.empty}`}
        style={{ animationDelay: `${index * 0.1}s` }}
      >
        <span className={styles.emptyText}>대기중</span>
      </div>
    );
  }

  const { 
    nickname, 
    profileImage, 
    score, 
    isHost, 
    isReady, 
    isCamOn, 
    isMe 
  } = participant;

  return (
    <div 
      className={styles.participantCard}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* 캠 상태 점 아이콘 */}
      <div className={`${styles.camStatus} ${isCamOn ? styles.on : styles.off}`}></div>

      {/* 방장 표시 */}
      {isHost && <span className={styles.hostBadge}>방장</span>}

      {/* 프로필 이미지 */}
      <div className={styles.profileImageWrapper}>
        <img 
          src={profileImage || '/default-profile.png'} 
          alt={`${nickname} 프로필`}
          className={styles.profileImage}
        />
      </div>

      {/* 닉네임 */}
      <p className={styles.nickname}>
        {nickname}{isMe && ' (나)'}
      </p>

      {/* 코인 아이콘 + 점수 */}
      <div className={styles.scoreWrapper}>
        <FontAwesomeIcon icon={faCoins} className={styles.coinIcon} />
        <span className={styles.score}>{score}</span>
      </div>

      {/* READY 표시 */}
      {isReady && !isHost && (
        <div className={styles.readyBadge}>READY</div>
      )}
    </div>
  );
};

export default ParticipantCard;
