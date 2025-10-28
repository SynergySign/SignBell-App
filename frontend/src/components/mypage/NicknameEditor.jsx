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
import {UserProfileService} from "../../services/api/UserProfileService.js";
import {useAuthStore} from "../../store/auth/authStore.js";

const NicknameEditor = ({ initialNickname, onNicknameUpdate }) => {
  // TODO: 사용자 프로필 API 연동 필요
  // const [originalNickname] = useState('사용자'); // 원본 닉네임 저장
  const [originalNickname] = useState(initialNickname); // 원본 닉네임 저장
  // const [nickname, setNickname] = useState('사용자');
  const [nickname, setNickname] = useState(initialNickname);
  const [error, setError] = useState('');
  const user = useAuthStore((state) => state.user);

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

  /*const handleSubmit = async () => {
    const validationError = validateNickname(nickname);
    if (validationError) {
      setError(validationError);
      return;
    }

    const trimmedNickname = nickname.trim();
    
    // TODO: 닉네임 수정 API 연동 필요
    console.log('닉네임 수정:', trimmedNickname);

    try {
      // 닉네임 수정 API 호출
      const response = await UserProfileService.updateNickname(user.userId, trimmedNickname);

      if (response.data.success) {
        // 응답 데이터 구조에 맞게 'data' 필드를 추출하여 전달
        const updatedUser = response.data.data;

        if (onNicknameUpdate) {
          onNicknameUpdate(updatedUser); // 🔑 UserProfileResponse 객체 전달
        }

        // 입력 필드를 업데이트된 닉네임으로 설정
        // setNickname(trimmedNickname); // ❌ onNicknameUpdate가 MyPage에서 전역 상태를 업데이트하므로, 여기서 로컬 상태 업데이트는 불필요
      } else {
        setError(response.data.message || '닉네임 수정에 실패했습니다.');
      }
    } catch (e) {
      console.error('닉네임 수정 실패:', e);
      setError(e.response?.data?.message || '서버 오류로 닉네임 수정에 실패했습니다.');
    }
  };*/

  const handleSubmit = async () => {
    const errorMessage = validateNickname(nickname);
    if (errorMessage) {
      setError(errorMessage);
      return;
    }

    if (!user?.userId) {
      console.error('사용자 ID를 찾을 수 없습니다.');
      return;
    }

    try {
      console.log('닉네임 수정:', nickname);

      // updateProfile 대신 새로 추가한 updateNickname 메서드 호출
      const response = await UserProfileService.updateNickname(user.userId, nickname);

      console.log('닉네임 수정 성공:', response.data);

      // MyPage.jsx에 성공 콜백 전달
      onNicknameUpdate(response.data.data.nickname);

      // 로컬 상태 업데이트
      setError('');
      // setOriginalNickname(nickname); // onNicknameUpdate에서 처리될 수도 있으므로 생략
      // setNickname(nickname);

    } catch (error) {
      // NicknameEditor.jsx:87 에서 발생했던 에러가 잡힐 위치
      console.error('닉네임 수정 실패:', error);
      const errorMsg = error.response?.data?.message || '닉네임 수정 중 오류가 발생했습니다.';
      setError(errorMsg);
    }
  };

  const handleKeyPress = (e) => {
    // Enter 키로 제출
    if (e.key === 'Enter' && !isSubmitDisabled) {
      handleSubmit();
    }
  };

  // 🔑 [수정 1] nickname이 undefined/null일 경우 빈 문자열로 대체하는 임시 변수 선언
  const currentNickname = nickname ?? '';

  // 원본과 다르고, 에러가 없고, 비어있지 않을 때만 수정 버튼 활성화
  // const isModified = nickname.trim() !== originalNickname; // 이전 코드
  const isModified = currentNickname.trim() !== originalNickname;

  // const isSubmitDisabled = !isModified || error !== '' || nickname.trim() === ''; // 이전 코드
  const isSubmitDisabled = !isModified || error !== '' || currentNickname.trim() === '';

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
