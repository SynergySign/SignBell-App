/**
 * @개요 마이페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-23
 * @최종수정일 2025-10-23
 * @반환값 {JSX.Element} 마이페이지 컴포넌트
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileImageEditor from '../../components/mypage/ProfileImageEditor';
import NicknameEditor from '../../components/mypage/NicknameEditor';
import TermsSection from '../../components/mypage/TermsSection';
import Modal from '../../components/ui/Modal';
import { REQUIRED_TERMS, OPTIONAL_TERMS } from '../../data/termsContent';
import styles from './MyPage.module.scss';
import {useAuthStore} from "../../store/auth/authStore.js";

const MyPage = () => {
  const navigate = useNavigate();
  // 1. authStore에서 user 정보와 setUser 액션을 가져옵니다.
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser); // 액션은 안정적이므로 별도 호출해도 무방합니다.

  // termsStatus 로컬 상태는 userData의 값을 기반으로 초기화됩니다.
  const [termsStatus, setTermsStatus] = useState(
    user
      ? {
        required: user.requiredAgree,
        optional: user.optionalAgree
      }
      : {
        required: true, // 로딩 중 기본값
        optional: false, // 로딩 중 기본값
      }
  );

  // 전역 user 상태가 변경될 때 로컬 userData와 termsStatus를 동기화합니다.
  useEffect(() => {
    // 정보가 로드되면 termsStatus를 업데이트합니다.
    if (user) {
      setTermsStatus({
        required: user.requiredAgree,
        optional: user.optionalAgree
      });
    }
  }, [user]);


  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    content: '',
    isTermsModal: false, // 약관 모달인지 알림 모달인지 구분
  });

  // 닉네임 업데이트를 위한 key (리렌더링 트리거)
  // const [nicknameKey, setNicknameKey] = useState(0);

  const handleViewTerms = (termsType) => {
    if (termsType === 'required') {
      setModalState({
        isOpen: true,
        title: '서비스 필수 동의 약관',
        content: REQUIRED_TERMS,
        isTermsModal: true,
      });
    } else {
      setModalState({
        isOpen: true,
        title: '서비스 선택 동의 약관',
        content: OPTIONAL_TERMS,
        isTermsModal: true,
      });
    }
  };

  const handleNicknameUpdate = (updatedUser) => {
    // 3. 제출(DB 업데이트 성공) 후,
    setUser(updatedUser); // 전역 상태 업데이트 (이것이 위쪽 useEffect를 트리거하지만, 닉네임이 같아 무한 루프가 발생하지 않음)

    // 로컬 termsStatus도 즉시 갱신하여 화면 깜빡임 없이 반영합니다.
    if (updatedUser) {
      setTermsStatus({
        required: updatedUser.requiredAgree,
        optional: updatedUser.optionalAgree,
      });
    }

    // 닉네임 수정 성공 모달 표시
    setModalState({
      isOpen: true,
      title: '닉네임 수정 완료',
      content: `닉네임이 "${updatedUser.nickname}"(으)로 변경되었습니다.`,
      isTermsModal: false,
    });
    
    // 컴포넌트 리렌더링을 위한 key 업데이트
    // setNicknameKey(prev => prev + 1);
  };

  const handleEditTerms = () => {
    // 약관 수정 페이지로 이동하면서 현재 약관 동의 상태 전달
    navigate('/terms', { 
      state: { 
        termsStatus,
        fromMyPage: true // 마이페이지에서 왔다는 플래그
      } 
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      title: '',
      content: '',
      isTermsModal: false,
    });
  };

  // user 정보가 없을 경우
  if (!user) {
    return <div>사용자 정보를 불러오는 중입니다...</div>;
  }
  return (
    <div className={styles.myPage}>
      <div className={styles.mainContent}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>마이페이지</h1>
          
          <ProfileImageEditor
            initialImageUrl={user.profileImageUrl}
          />
          
          <NicknameEditor 
            // key={nicknameKey}
            initialNickname={user.nickname}
            onNicknameUpdate={handleNicknameUpdate}
          />
          
          <TermsSection 
            termsStatus={termsStatus}
            onViewTerms={handleViewTerms}
            onEditTerms={handleEditTerms}
          />
        </div>
      </div>

      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
      >
        {modalState.isTermsModal ? (
          <div
            className={styles.termsContent}
            dangerouslySetInnerHTML={{
              __html: modalState.content
                .replace(/\n/g, '<br />')
                .replace(/##\s+(.+)/g, '<h2>$1</h2>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            }}
          />
        ) : (
          <div className={styles.successMessage}>
            {modalState.content}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyPage;
