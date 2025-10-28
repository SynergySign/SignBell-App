/**
 * @개요 프로필 이미지 수정 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-23
 * @최종수정일 2025-10-23
 * @반환값 {JSX.Element} 프로필 이미지 수정 컴포넌트
 */

import { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faCamera } from '@fortawesome/free-solid-svg-icons';
import styles from './ProfileImageEditor.module.scss';

const ProfileImageEditor = ({initialImageUrl}) => {
  // TODO: 사용자 프로필 API 연동 필요
  // const [profileImage, setProfileImage] = useState(null);
  const [profileImage, setProfileImage] = useState(initialImageUrl || null);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 형식 검증
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('JPG, PNG, GIF 형식의 이미지만 업로드 가능합니다.');
      // 파일 input 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // 파일 크기 검증 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('이미지 크기는 5MB 이하여야 합니다.');
      // 파일 input 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // 이미지 미리보기
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileImage(e.target.result);
      setImageError(false);
      // TODO: 이미지 업로드 API 연동 필요
      console.log('이미지 선택됨:', file.name);
    };
    reader.onerror = () => {
      alert('이미지를 불러오는데 실패했습니다.');
      // 파일 input 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className={styles.profileImageEditor}>
      <div className={styles.imageContainer}>
        {profileImage && !imageError ? (
          <img
            src={profileImage}
            alt="프로필 이미지"
            className={styles.profileImage}
            onError={handleImageError}
          />
        ) : (
          <div className={styles.imagePlaceholder}>
            <FontAwesomeIcon icon={faUser} />
          </div>
        )}
        
        {/* <button
          className={styles.cameraButton}
          onClick={handleImageClick}
          aria-label="프로필 이미지 변경"
          title="프로필 이미지 변경"
        >
          <FontAwesomeIcon icon={faCamera} aria-hidden="true" />
        </button>*/}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif"
        onChange={handleFileChange}
        className={styles.fileInput}
        aria-label="이미지 파일 선택"
        tabIndex={-1}
      />
    </div>
  );
};

export default ProfileImageEditor;
