/**
 * @개요 사용자 프로필 카드 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @반환값 {JSX.Element} 사용자 프로필 카드 컴포넌트
 */

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faCoins, faUser } from '@fortawesome/free-solid-svg-icons';
import styles from './UserProfileCard.module.scss';

const UserProfileCard = () => {
  // TODO: 사용자 프로필 API 연동 필요
  const userProfile = {
    nickname: '사용자',
    profileImage: null, // API에서 받아올 이미지 URL
    score: 1250
  };

  const [imageError, setImageError] = useState(false);

  const handleEditClick = () => {
    // TODO: 마이페이지 구현 후 연결
    console.log('닉네임 수정 클릭');
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className={styles.userProfileCard}>
      <div className={styles.profileImageContainer}>
        {userProfile.profileImage && !imageError ? (
          <img 
            src={userProfile.profileImage} 
            alt="프로필 이미지" 
            className={styles.profileImage}
            onError={handleImageError}
          />
        ) : (
          <div className={styles.profileImagePlaceholder}>
            <FontAwesomeIcon icon={faUser} />
          </div>
        )}
      </div>
      
      <div className={styles.profileInfo}>
        <div className={styles.nicknameSection}>
          <h2 className={styles.nickname}>{userProfile.nickname}</h2>
          <button 
            className={styles.editIcon}
            onClick={handleEditClick}
            aria-label="닉네임 수정"
          >
            <FontAwesomeIcon icon={faPenToSquare} />
          </button>
        </div>
        
        <div className={styles.scoreSection}>
          <FontAwesomeIcon icon={faCoins} className={styles.coinIcon} />
          <span className={styles.score}>{userProfile.score}</span>
        </div>
      </div>
    </div>
  );
};

export default UserProfileCard;
