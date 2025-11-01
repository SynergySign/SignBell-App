/**
 * @개요 약관 동의 페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @반환값 {JSX.Element} 약관 동의 페이지 컴포넌트
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AgreementToggle from '../../components/ui/AgreementToggle';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { REQUIRED_TERMS, OPTIONAL_TERMS } from '../../data/termsContent';
import styles from './TermsPage.module.scss';
import { useAuthStore } from '../../store/auth/authStore';
import apiClient from '../../services/api/apiClient';

const TermsPage = () => {
  const navigate = useNavigate();
  const { user, fetchMe, refreshMeSilent, logout } = useAuthStore();
  const [agreements, setAgreements] = useState({
    // 마이페이지에서 전달받은 약관 동의 상태
    required: false,
    optional: false,
  });
  const location = useLocation();
  const fromMyPage = location.state?.fromMyPage || false;


  // 1. 페이지 진입 시 fetchMe()를 호출하고 requiredAgree 상태 확인
  useEffect(() => {
    // 1-1. 사용자 정보가 없으면 fetchMe() 호출
    if (!user) {
      console.log("TermsPage: User not loaded, calling fetchMe().");
      fetchMe();
      return;
    }

    // 1-2. 사용자 정보가 있고, 필수 약관에 이미 동의했다면 즉시 리디렉션 처리
    if (!fromMyPage && user.requiredAgree === true) {
      console.log("TermsPage: Required agreement already true. Redirecting to /main.");

      // 팝업 창에서 넘어온 경우
      if (window.opener) {
        // 부모 창을 /main으로 이동시키고 팝업 창을 닫음
        console.log("TermsPage (Popup): Redirecting opener to /main and closing.");
        window.opener.location.href = "https://www.signbell.app/main";
        window.opener.focus();
        window.close();
      } else {
        // 메인 창인 경우
        navigate('/main', { replace: true });
      }
      return;
    }

    // 1-3. 초기 약관 상태 설정 (마이페이지에서 온 경우가 아니라면 user 정보로 초기 상태 설정)
    // 이 로직은 `requiredAgree`가 `false`일 때만 실행되어야 합니다.
    if (user && !fromMyPage) {
      setAgreements({
        required: user.requiredAgree,
        optional: user.optionalAgree ?? false,
      });
    }

  }, [user, navigate, fromMyPage, fetchMe]); // user 객체의 변경을 주시


  // 마이페이지에서 온 경우 필수 약관은 항상 체크 상태 유지
  useEffect(() => {
    if (fromMyPage && user) {
      console.log('📝 마이페이지에서 진입 - 약관 상태 초기화:', {
        requiredAgree: user.requiredAgree,
        optionalAgree: user.optionalAgree
      });
      
      setAgreements({
        required: true, // 필수 약관은 항상 true (마이페이지에서는 수정 불가)
        optional: user.optionalAgree ?? false, // 서버에서 받은 선택 약관 상태
      });
    }
  }, [fromMyPage, user?.optionalAgree]); // 🔥 user 전체가 아닌 optionalAgree만 의존성으로 추가
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    content: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = (key) => {
    // 마이페이지에서 온 경우 필수 약관은 수정 불가
    if (fromMyPage && key === 'required') {
      console.log('⚠️ 마이페이지에서는 필수 약관 수정 불가');
      return;
    }

    console.log(`🔄 약관 토글: ${key} = ${!agreements[key]}`);
    setAgreements(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleAllAgree = () => {
    if (fromMyPage) {
      // 마이페이지에서 온 경우: 필수 약관은 항상 true, 선택 약관만 토글
      setAgreements(prev => ({
        required: true, // 필수 약관은 항상 true
        optional: !prev.optional,
      }));
    } else {
      // 최초 가입 시: 모든 약관 토글
      const allChecked = agreements.required && agreements.optional;
      setAgreements({
        required: !allChecked,
        optional: !allChecked,
      });
    }
  };

  const openTermsModal = (type) => {
    if (type === 'required') {
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

  const closeModal = () => {
    setModalState({
      isOpen: false,
      title: '',
      content: '',
    });
  };

  const handleSubmit = async () => {
    console.log('=== handleSubmit called ===');
    console.log('user:', user);
    console.log('user?.userId:', user?.userId);
    console.log('agreements:', agreements);
    
    if (!user?.userId) {
      console.error('User ID not found, calling fetchMe()');
      await fetchMe();
      // fetchMe 후 다시 체크
      const { user: updatedUser } = useAuthStore.getState();
      if (!updatedUser?.userId) {
        console.error('Still no user after fetchMe');
        alert('사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      console.log('Calling API: PUT /users/me/agreement');
      
      // 🔥 약관 동의 상태를 body에 포함하여 전송
      const response = await apiClient.put('/users/me/agreement', {
        requiredAgree: agreements.required,
        optionalAgree: agreements.optional
      });

      console.log('약관 동의 성공:', response.data);
      
      // 🔥 사용자 정보 갱신 (서버에서 최신 상태 가져오기)
      await refreshMeSilent();
      
      if (fromMyPage) {
        // 마이페이지에서 온 경우: 약관 동의 상태 업데이트 후 마이페이지로 돌아가기
        console.log('약관 동의 수정 완료', agreements);
        navigate('/mypage');
      } else {
        // 최초 가입 시: 팝업 창이면 부모 창으로 메인 이동 후 팝업 닫기
        console.log('약관 동의 제출 완료', agreements);
        
        if (window.opener) {
          // 팝업 창인 경우
          console.log('팝업 창에서 약관 동의 완료 - 부모 창을 /main으로 이동');
          window.opener.location.href = 'https://www.signbell.app/main';
          window.opener.focus();
          window.close();
        } else {
          // 일반 창인 경우
          console.log('일반 창에서 약관 동의 완료 - /main으로 이동');
          navigate('/main', { replace: true });
        }
      }
    } catch (error) {
      console.error('약관 동의 API 호출 실패:', error);
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      }
      alert('약관 동의 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    // TODO: 로그아웃 확인 모달 표시 (현재는 모달 없이 바로 로그아웃 처리)
    console.log('로그아웃 시도');
    // zustand store의 logout 액션 호출 (서버 로그아웃 + 클라이언트 상태 초기화)
    await logout();
    // 로그아웃 후 랜딩 페이지로 이동
    navigate('/popup-close?status=logout');
  };

  const handleCancel = () => {
    // 마이페이지로 돌아가기
    navigate('/mypage');
  };

  const isSubmitEnabled = agreements.required;
  const isAllChecked = agreements.required && agreements.optional;

  return (
    <div className={styles.termsPage}>
      <div className={styles.termsContainer}>
        <div className={styles.termsBox}>
          <h2 className={styles.termsTitle}>약관 동의</h2>
          <p className={styles.termsSubtitle}>서비스 이용을 위해 약관에 동의해주세요</p>

          <div className={styles.agreementsSection}>
            <div className={styles.allAgree}>
              <AgreementToggle
                checked={isAllChecked}
                onChange={handleAllAgree}
                label="전체 동의"
              />
            </div>

            <div className={styles.divider}></div>

            <div className={styles.agreementItem}>
              <AgreementToggle
                checked={agreements.required}
                onChange={() => handleToggle('required')}
                label="(필수) 서비스 필수 동의 약관"
                disabled={fromMyPage} // 마이페이지에서 온 경우 비활성화
              />
              <button
                className={styles.viewTermsButton}
                onClick={() => openTermsModal('required')}
              >
                전문보기
              </button>
            </div>

            <div className={styles.agreementItem}>
              <AgreementToggle
                checked={agreements.optional}
                onChange={() => handleToggle('optional')}
                label="(선택) 서비스 선택 동의 약관"
              />
              <button
                className={styles.viewTermsButton}
                onClick={() => openTermsModal('optional')}
              >
                전문보기
              </button>
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <Button
              onClick={handleSubmit}
              disabled={!isSubmitEnabled || isSubmitting}
            >
              {/* isSubmitting이 true이면 '처리 중...'을 표시 */}
              {isSubmitting
                ? '처리 중...'
                : (
                  // isSubmitting이 false일 때 fromMyPage에 따라 '저장' 또는 '제출'을 표시
                  fromMyPage ? '저장' : '제출'
                )
              }
            </Button>
            {fromMyPage ? (
              <Button
                onClick={handleCancel}
                variant="secondary"
              >
                취소
              </Button>
            ) : (
              <Button
                onClick={handleLogout}
                variant="secondary"
              >
                로그아웃
              </Button>
            )}
          </div>
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

export default TermsPage;
