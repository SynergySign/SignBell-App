/**
 * @개요 닉네임 수정 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-23
 * @최종수정일 2025-10-23
 * @반환값 {JSX.Element} 닉네임 수정 컴포넌트
 */

import { useState } from 'react';
import styles from './NicknameEditor.module.scss';

const NicknameEditor = () => {
  // TODO: 사용자 프로필 API 연동 필요
  const [originalNickname] = useState('사용자'); // 원본 닉네임 저장
  const [nickname, setNickname] = useState('사용자');
  const [error, setError] = useState('');

  const validateNickname = (value) => {
    if (value.trim().length < 2) {
      return '닉네임은 2자 이상이어야 합니다.';
    }
    if (value.trim().length > 10) {
      return '닉네임은 10자 이하여야 합니다.';
    }
    // 특수문자 필터링 (한글, 영문, 숫자만 허용)
    const regex = /^[가-힣a-zA-Z0-9]+$/;
    if (!regex.test(value.trim())) {
      return '닉네임은 한글, 영문, 숫자만 사용 가능합니다.';
    }
    return '';
  };

  const handleNicknameChange = (e) => {
    const value = e.target.value;
    setNickname(value);
    
    const validationError = validateNickname(value);
    setError(validationError);
  };

  const handleSubmit = () => {
    const validationError = validateNickname(nickname);
    if (validationError) {
      setError(validationError);
      return;
    }

    // TODO: 닉네임 수정 API 연동 필요
    console.log('닉네임 수정:', nickname.trim());
    alert('닉네임이 수정되었습니다.');
  };

  // 원본과 다르고, 에러가 없고, 비어있지 않을 때만 수정 버튼 활성화
  const isModified = nickname.trim() !== originalNickname;
  const isSubmitDisabled = !isModified || error !== '' || nickname.trim() === '';

  return (
    <div className={styles.nicknameEditor}>
      <label htmlFor="nickname" className={styles.label}>
        닉네임
      </label>
      <div className={styles.inputWrapper}>
        <input
          id="nickname"
          type="text"
          value={nickname}
          onChange={handleNicknameChange}
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          placeholder="닉네임을 입력하세요"
          maxLength={10}
          aria-label="닉네임 입력"
          aria-invalid={error !== ''}
          aria-describedby={error ? 'nickname-error' : undefined}
        />
        <button
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className={styles.submitButton}
          aria-label="닉네임 수정"
        >
          수정
        </button>
      </div>
      <div className={styles.errorMessage}>
        {error && (
          <span id="nickname-error" role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
};

export default NicknameEditor;
