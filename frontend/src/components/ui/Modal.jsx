/**
 * @개요 공통 모달 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-17
 * @최종수정일 2025-10-20
 * @매개변수 {boolean} props.isOpen - 모달 열림 상태
 * @매개변수 {function} props.onClose - 모달 닫기 핸들러
 * @매개변수 {string} props.title - 모달 제목
 * @매개변수 {React.ReactNode} props.children - 모달 내용
 * @반환값 {JSX.Element} 모달 컴포넌트
 */

import styles from './Modal.module.scss';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{title}</h3>
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.modalContent}>
          {children}
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.modalButton} onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
