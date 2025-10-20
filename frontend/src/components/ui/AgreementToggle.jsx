/**
 * @개요 iOS 스타일 토글 스위치 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-20
 * @매개변수 {boolean} props.checked - 토글 상태
 * @매개변수 {function} props.onChange - 토글 변경 핸들러
 * @매개변수 {string} props.label - 토글 레이블
 * @반환값 {JSX.Element} 토글 스위치 컴포넌트
 */

import styles from './AgreementToggle.module.scss';

const AgreementToggle = ({ checked, onChange, label }) => {
  return (
    <div className={styles.agreementToggle}>
      <label className={styles.toggleLabel}>
        <span className={styles.toggleText}>{label}</span>
        <div className={styles.toggleSwitch}>
          <input
            type="checkbox"
            checked={checked}
            onChange={onChange}
          />
          <span className={styles.toggleSlider}></span>
        </div>
      </label>
    </div>
  );
};

export default AgreementToggle;
