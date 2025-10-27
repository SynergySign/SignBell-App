/**
 * @개요 닉네임 수정 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-23
 * @최종수정일 2025-10-23
 * @매개변수 {Function} props.onNicknameUpdate - 닉네임 수정 성공 시 호출되는 콜백 함수
 * @반환값 {JSX.Element} 닉네임 수정 컴포넌트
 */

import { useState } from 'react';
import styles from './NicknameEditor.module.scss';

const NicknameEditor = ({ initialNickname, onNicknameUpdate }) => {
  // TODO: 사용자 프로필 API 연동 필요
  // const [originalNickname] = useState('사용자'); // 원본 닉네임 저장
  const [originalNickname] = useState(initialNickname); // 원본 닉네임 저장
  // const [nickname, setNickname] = useState('사용자');
  const [nickname, setNickname] = useState(initialNickname);
  const [error, setError] = useState('');

  const validateNickname = (value) => {
    const trimmedValue = value.trim();
    
    if (trimmedValue.length === 0) {
      return '닉네임을 입력해주세요.';
    }
    if (trimmedValue.length < 2) {
      return '닉네임은 2자 이상이어야 합니다.';
    }
    if (trimmedValue.length > 10) {
      return '닉네임은 10자 이하여야 합니다.';
    }
    // 특수문자 필터링 (한글, 영문, 숫자만 허용)
    const regex = /^[가-힣a-zA-Z0-9]+$/;
    if (!regex.test(trimmedValue)) {
      return '닉네임은 한글, 영문, 숫자만 사용 가능합니다.';
    }
    return '';
  };

  const handleNicknameChange = (e) => {
    const value = e.target.value;
    setNickname(value);
    
    // 입력 중에는 에러 메시지를 표시하지 않음 (빈 값 제외)
    if (value.trim().length > 0) {
      const validationError = validateNickname(value);
      setError(validationError);
    } else {
      setError('');
    }
  };

  const handleSubmit = () => {
    const validationError = validateNickname(nickname);
    if (validationError) {
      setError(validationError);
      return;
    }

    const trimmedNickname = nickname.trim();
    
    // TODO: 닉네임 수정 API 연동 필요
    console.log('닉네임 수정:', trimmedNickname);
    
    // 부모 컴포넌트에 닉네임 업데이트 알림
    if (onNicknameUpdate) {
      onNicknameUpdate(trimmedNickname);
    }
  };

  const handleKeyPress = (e) => {
    // Enter 키로 제출
    if (e.key === 'Enter' && !isSubmitDisabled) {
      handleSubmit();
    }
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
          onKeyPress={handleKeyPress}
          className={`${styles.input} ${error ? styles.inputError : ''}`}
          placeholder="닉네임을 입력하세요"
          maxLength={10}
          aria-label="닉네임 입력"
          aria-invalid={error !== ''}
          aria-describedby={error ? 'nickname-error' : undefined}
          autoComplete="nickname"
        />
        <button
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className={styles.submitButton}
          aria-label="닉네임 수정"
          title="닉네임 수정"
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
