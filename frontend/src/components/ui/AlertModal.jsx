/**
 * @개요 알림 모달 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @매개변수 {boolean} props.isOpen - 모달 열림 상태
 * @매개변수 {function} props.onClose - 모달 닫기 핸들러
 * @매개변수 {string} props.title - 모달 제목
 * @매개변수 {string} props.message - 알림 메시지
 * @매개변수 {string} props.type - 알림 타입 (info, warning, error, success)
 * @반환값 {JSX.Element} 알림 모달 컴포넌트
 */

import styles from './AlertModal.module.scss';

const AlertModal = ({ 
  isOpen, 
  onClose, 
  title = '알림', 
  message, 
  type = 'info' 
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      default:
        return 'ℹ️';
    }
  };

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}></div>
      <div className={`${styles.alertModal} ${styles[type]}`}>
        <div className={styles.iconWrapper}>
          <span className={styles.icon}>{getIcon()}</span>
        </div>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.message}>{message}</p>
        <button className={styles.confirmButton} onClick={onClose}>
          확인
        </button>
      </div>
    </>
  );
};

export default AlertModal;
