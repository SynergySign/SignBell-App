/**
 * @개요 마이페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-23
 * @최종수정일 2025-10-23
 * @반환값 {JSX.Element} 마이페이지 컴포넌트
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ProfileImageEditor from '../../components/mypage/ProfileImageEditor';
import NicknameEditor from '../../components/mypage/NicknameEditor';
import TermsSection from '../../components/mypage/TermsSection';
import Modal from '../../components/ui/Modal';
import { REQUIRED_TERMS, OPTIONAL_TERMS } from '../../data/termsContent';
import styles from './MyPage.module.scss';

const MyPage = () => {
  const navigate = useNavigate();
  
  // TODO: 사용자 약관 동의 상태 API 연동 필요
  // API 호출 예시: const { data } = await getUserTermsStatus();
  // 응답 형식: { required: true, optional: false }
  const [termsStatus] = useState({
    required: true, // 필수 약관은 항상 true (이미 동의한 상태)
    optional: false, // 선택 약관 동의 상태 (API에서 받아올 값)
  });

  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    content: '',
  });

  const handleViewTerms = (termsType) => {
    if (termsType === 'required') {
      setModalState({
        isOpen: true,
        title: '서비스 필수 동의 약관',
        content: REQUIRED_TERMS,
      });
    } else {
      setModalState({
        isOpen: true,
        title: '서비스 선택 동의 약관',
        content: OPTIONAL_TERMS,
      });
    }
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
    });
  };

  return (
    <div className={styles.myPage}>
      <div className={styles.mainContent}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>마이페이지</h1>
          
          <ProfileImageEditor />
          
          <NicknameEditor />
          
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
        <div
          className={styles.termsContent}
          dangerouslySetInnerHTML={{
            __html: modalState.content
              .replace(/\n/g, '<br />')
              .replace(/##\s+(.+)/g, '<h2>$1</h2>')
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          }}
        />
      </Modal>
    </div>
  );
};

export default MyPage;
