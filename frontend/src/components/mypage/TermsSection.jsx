/**
 * @개요 약관 보기 섹션 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-23
 * @최종수정일 2025-10-23
 * @매개변수 {Object} props.termsStatus - 약관 동의 상태 객체 { required: boolean, optional: boolean }
 * @매개변수 {Function} props.onViewTerms - 약관 보기 버튼 클릭 시 호출되는 함수
 * @매개변수 {Function} props.onEditTerms - 약관 수정 버튼 클릭 시 호출되는 함수
 * @반환값 {JSX.Element} 약관 보기 섹션 컴포넌트
 */

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faCheck } from '@fortawesome/free-solid-svg-icons';
import styles from './TermsSection.module.scss';

const TermsSection = ({ termsStatus, onViewTerms, onEditTerms }) => {
  return (
    <div className={styles.termsSection}>
      <div className={styles.divider}></div>
      
      <div className={styles.termsList}>
        {/* 필수 약관 */}
        <button
          className={styles.termsButton}
          onClick={() => onViewTerms('required')}
          aria-label="서비스 필수 동의 약관 보기"
          title="서비스 필수 동의 약관 보기"
        >
          <div className={styles.termsInfo}>
            <span className={styles.termsLabel}>서비스 필수 동의 약관</span>
            <div className={styles.termsStatus} aria-label="동의 상태: 동의함">
              <FontAwesomeIcon icon={faCheck} className={styles.checkIcon} aria-hidden="true" />
              <span className={styles.statusText}>동의함</span>
            </div>
          </div>
          <FontAwesomeIcon icon={faChevronRight} className={styles.chevronIcon} aria-hidden="true" />
        </button>

        {/* 선택 약관 */}
        <button
          className={styles.termsButton}
          onClick={() => onViewTerms('optional')}
          aria-label="서비스 선택 동의 약관 보기"
          title="서비스 선택 동의 약관 보기"
        >
          <div className={styles.termsInfo}>
            <span className={styles.termsLabel}>서비스 선택 동의 약관</span>
            <div 
              className={styles.termsStatus} 
              aria-label={`동의 상태: ${termsStatus.optional ? '동의함' : '동의 안 함'}`}
            >
              {termsStatus.optional ? (
                <>
                  <FontAwesomeIcon icon={faCheck} className={styles.checkIcon} aria-hidden="true" />
                  <span className={styles.statusText}>동의함</span>
                </>
              ) : (
                <span className={styles.statusTextInactive}>동의 안 함</span>
              )}
            </div>
          </div>
          <FontAwesomeIcon icon={faChevronRight} className={styles.chevronIcon} aria-hidden="true" />
        </button>
      </div>

      {/* 약관 동의 수정 버튼 */}
      <button
        className={styles.editTermsButton}
        onClick={onEditTerms}
        aria-label="약관 동의 수정"
        title="약관 동의 수정"
      >
        약관 동의 수정
      </button>
    </div>
  );
};

export default TermsSection;
