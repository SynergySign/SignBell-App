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


  // 1. ✅ 추가된 로직: 페이지 진입 시 fetchMe()를 호출하고 requiredAgree 상태 확인
  useEffect(() => {
    // 1-1. 사용자 정보가 없으면 fetchMe() 호출
    if (!user) {
      console.log("TermsPage: User not loaded, calling fetchMe().");
      fetchMe();
      return;
    }

    // 1-2. 사용자 정보가 있고, 필수 약관에 이미 동의했다면 즉시 리디렉션 처리
    if (user && user.requiredAgree === true) {
      console.log("TermsPage: Required agreement already true. Redirecting to /main.");

      // 팝업 창에서 넘어온 경우
      if (window.opener) {
        // 부모 창을 /main으로 이동시키고 팝업 창을 닫음
        console.log("TermsPage (Popup): Redirecting opener to /main and closing.");
        window.opener.location.href = "https://localhost:5173/main";
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
        optional: user.optionalAgree,
      });
    }

  }, [user, navigate, fromMyPage, fetchMe]); // user 객체의 변경을 주시

  // 마이페이지에서 온 경우 필수 약관은 항상 체크 상태 유지
  useEffect(() => {
    if (fromMyPage) {
      setAgreements(prev => ({
        ...prev,
        required: true, // 필수 약관은 항상 true
      }));
    }
  }, [fromMyPage]);
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    content: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = (key) => {
    // 마이페이지에서 온 경우 필수 약관은 수정 불가
    if (fromMyPage && key === 'required') {
      return;
    }

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
    if (!user?.userId) {
      console.error('User ID not found');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/my-page/users/${user.userId}/terms-agreement`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          optionalAgree: agreements.optional, // 선택 동의만 전달
        }),
      });

      if (response.ok) {
        console.log('약관 동의 성공');
        // 사용자 정보 갱신
        await refreshMeSilent();
        if (fromMyPage) {
          // 마이페이지에서 온 경우: 약관 동의 상태 업데이트 후 마이페이지로 돌아가기
          // TODO: 약관 동의 상태 업데이트 API 연동 필요
          console.log('약관 동의 수정', agreements);
          navigate('/mypage');
        } else {
          // 최초 가입 시: 팝업 닫기 페이지로 이동
          // TODO: API 연동이 필요합니다.
          console.log('약관 동의 제출', agreements);
          navigate('/popup-close');
        }
      } else {
        console.error('약관 동의 실패:', response.status);
        alert('약관 동의 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('약관 동의 API 호출 실패:', error);
      alert('약관 동의 처리 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };
  /*const handleSubmit = () => {
    if (fromMyPage) {
      // 마이페이지에서 온 경우: 약관 동의 상태 업데이트 후 마이페이지로 돌아가기
      // TODO: 약관 동의 상태 업데이트 API 연동 필요
      console.log('약관 동의 수정', agreements);
      navigate('/mypage');
    } else {
      // 최초 가입 시: 팝업 닫기 페이지로 이동
      // TODO: API 연동이 필요합니다.
      console.log('약관 동의 제출', agreements);
      navigate('/popup-close');
    }
  };*/

  /*const handleLogout = () => {
    // TODO: 로그아웃 확인 모달 표시
    console.log('로그아웃');
    navigate('/');
  };*/

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
