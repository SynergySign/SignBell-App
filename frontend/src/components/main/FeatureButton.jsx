/**
 * @개요 기능 버튼 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-17
 * @매개변수 {string} props.title - 버튼 제목
 * @매개변수 {string} props.icon - Font Awesome 아이콘
 * @매개변수 {function} props.onClick - 클릭 핸들러
 * @매개변수 {number} props.delay - 애니메이션 딜레이 (초)
 * @매개변수 {boolean} props.active - 활성화 상태
 * @반환값 {JSX.Element} 기능 버튼 컴포넌트
 */

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './FeatureButton.module.scss';

const FeatureButton = ({ title, icon, onClick, delay = 0, active = false }) => {
  return (
    <button 
      className={`${styles.featureButton} ${active ? styles.active : ''}`}
      onClick={onClick}
      style={{ animationDelay: `${delay}s` }}
    >
      <FontAwesomeIcon icon={icon} className={styles.buttonIcon} />
      <span className={styles.buttonTitle}>{title}</span>
    </button>
  );
};

export default FeatureButton;
