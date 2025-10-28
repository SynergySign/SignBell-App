/**
 * @개요 게임 결과 모달 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-28 (중복 클릭 방지 추가)
 * @매개변수 {boolean} props.isOpen - 모달 열림 상태
 * @매개변수 {function} props.onReturnToRoom - 대기실로 돌아가기 핸들러
 * @매개변수 {array} props.rankings - 순위 데이터 배열
 * @반환값 {JSX.Element} 게임 결과 모달 컴포넌트
 */

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faMedal, faAward } from '@fortawesome/free-solid-svg-icons';
import styles from './GameResultModal.module.scss';

const GameResultModal = ({ isOpen, onReturnToRoom, rankings = [] }) => {
  const [isReturning, setIsReturning] = useState(false);
  
  if (!isOpen) return null;

  const handleReturnClick = async () => {
    // 🔥 중복 클릭 방지
    if (isReturning) {
      console.log('⚠️ 이미 대기실 복귀 중 - 중복 클릭 방지');
      return;
    }
    
    setIsReturning(true);
    try {
      await onReturnToRoom();
    } catch (error) {
      console.error('❌ 대기실 복귀 실패:', error);
      setIsReturning(false);
    }
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <FontAwesomeIcon icon={faTrophy} className={`${styles.rankIcon} ${styles.gold}`} />;
      case 2:
        return <FontAwesomeIcon icon={faMedal} className={`${styles.rankIcon} ${styles.silver}`} />;
      case 3:
        return <FontAwesomeIcon icon={faAward} className={`${styles.rankIcon} ${styles.bronze}`} />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* 모달 외부 클릭 방지 */}
      <div className={styles.modalOverlay} onClick={(e) => e.stopPropagation()}></div>
      <div className={styles.gameResultModal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>게임 결과</h2>
        </div>

        <div className={styles.rankingsSection}>
          {rankings.map((player, index) => (
            <div 
              key={player.userId} 
              className={`${styles.rankItem} ${styles[`rank${player.rank}`]}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {player.rank <= 3 && (
                <div className={styles.rankIconWrapper}>
                  {getRankIcon(player.rank)}
                </div>
              )}
              
              <div className={styles.rankInfo}>
                <span className={styles.rankNumber}>{player.rank}등</span>
                <span className={styles.playerNickname}>{player.nickname}</span>
              </div>

              <span className={styles.playerScore}>({player.score}점)</span>
            </div>
          ))}
        </div>

        <button 
          className={styles.returnButton}
          onClick={handleReturnClick}
          disabled={isReturning}
        >
          {isReturning ? '이동 중...' : '대기실로 돌아가기'}
        </button>
      </div>
    </>
  );
};

export default GameResultModal;
