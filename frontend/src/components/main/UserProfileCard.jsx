/**
 * @개요 사용자 프로필 카드 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @반환값 {JSX.Element} 사용자 프로필 카드 컴포넌트
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faCoins, faUser } from '@fortawesome/free-solid-svg-icons';
import styles from './UserProfileCard.module.scss';
import {useAuthStore} from "../../store/auth/authStore.js";

const UserProfileCard = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  // TODO: 사용자 프로필 API 연동 필요
  /*const userProfile = {
    nickname: '사용자',
    profileImage: null, // API에서 받아올 이미지 URL
    score: 1250
  };*/

  const [imageError, setImageError] = useState(false);

  const handleEditClick = () => {
    navigate('/mypage');
  };

  const handleImageError = () => {
    setImageError(true);
  };

  // 4. user 객체에서 필요한 정보를 추출하거나 기본값을 설정합니다.
  const nickname = user?.nickname ?? '사용자'; // 닉네임
  const profileImage = user?.profileImageUrl ?? null; // 프로필 이미지 URL
  const score = user?.totalScore ?? 0; // 토탈 스코어

  return (
    <div className={styles.userProfileCard}>
      <div className={styles.profileImageContainer}>
        {profileImage&& !imageError ? (
          <img 
            src={profileImage}
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
          <h2 className={styles.nickname}>{nickname}</h2>
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
          <span className={styles.score}>{score}</span>
        </div>
      </div>
    </div>
  );
};

export default UserProfileCard;
