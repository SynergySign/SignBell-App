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
import './UserProfileCard.scss';

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
    <div className="user-profile-card">
      <div className="profile-image-container">
        {userProfile.profileImage && !imageError ? (
          <img 
            src={userProfile.profileImage} 
            alt="프로필 이미지" 
            className="profile-image"
            onError={handleImageError}
          />
        ) : (
          <div className="profile-image-placeholder">
            <FontAwesomeIcon icon={faUser} />
          </div>
        )}
      </div>
      
      <div className="profile-info">
        <div className="nickname-section">
          <h2 className="nickname">{userProfile.nickname}</h2>
          <button 
            className="edit-icon"
            onClick={handleEditClick}
            aria-label="닉네임 수정"
          >
            <FontAwesomeIcon icon={faPenToSquare} />
          </button>
        </div>
        
        <div className="score-section">
          <FontAwesomeIcon icon={faCoins} className="coin-icon" />
          <span className="score">{userProfile.score}</span>
        </div>
      </div>
    </div>
  );
};

export default UserProfileCard;
