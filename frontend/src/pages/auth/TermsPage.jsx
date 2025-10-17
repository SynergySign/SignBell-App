/**
 * @개요 약관 동의 페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @반환값 {JSX.Element} 약관 동의 페이지 컴포넌트
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AgreementToggle from '../../components/ui/AgreementToggle';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { REQUIRED_TERMS, OPTIONAL_TERMS } from '../../data/termsContent';
import './TermsPage.scss';

const TermsPage = () => {
  const navigate = useNavigate();
  const [agreements, setAgreements] = useState({
    required: false,
    optional: false,
  });
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    content: '',
  });

  const handleToggle = (key) => {
    setAgreements(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleAllAgree = () => {
    const allChecked = agreements.required && agreements.optional;
    setAgreements({
      required: !allChecked,
      optional: !allChecked,
    });
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

  const handleSubmit = () => {
    // TODO: API 연동이 필요합니다.
    console.log('약관 동의 제출', agreements);
    navigate('/gameroom');
  };

  const handleLogout = () => {
    // TODO: 로그아웃 확인 모달 표시
    console.log('로그아웃');
    navigate('/');
  };

  const isSubmitEnabled = agreements.required;
  const isAllChecked = agreements.required && agreements.optional;

  return (
    <div className="terms-page">
      <div className="terms-container">
        <div className="terms-box">
          <h2 className="terms-title">약관 동의</h2>
          <p className="terms-subtitle">서비스 이용을 위해 약관에 동의해주세요</p>

          <div className="agreements-section">
            <div className="all-agree">
              <AgreementToggle
                checked={isAllChecked}
                onChange={handleAllAgree}
                label="전체 동의"
              />
            </div>

            <div className="divider"></div>

            <div className="agreement-item">
              <AgreementToggle
                checked={agreements.required}
                onChange={() => handleToggle('required')}
                label="(필수) 서비스 필수 동의 약관"
              />
              <button
                className="view-terms-button"
                onClick={() => openTermsModal('required')}
              >
                전문보기
              </button>
            </div>

            <div className="agreement-item">
              <AgreementToggle
                checked={agreements.optional}
                onChange={() => handleToggle('optional')}
                label="(선택) 서비스 선택 동의 약관"
              />
              <button
                className="view-terms-button"
                onClick={() => openTermsModal('optional')}
              >
                전문보기
              </button>
            </div>
          </div>

          <div className="button-group">
            <Button
              onClick={handleSubmit}
              disabled={!isSubmitEnabled}
            >
              제출
            </Button>
            <Button
              onClick={handleLogout}
              variant="secondary"
            >
              로그아웃
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
      >
        <div
          className="terms-content"
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
