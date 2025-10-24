import styles from '../../pages/quiz/QuizGamePage.module.scss';

/**
 * 나가기 확인 모달 컴포넌트
 */
const QuizExitModal = ({ isOpen, onCancel, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className={styles.modalOverlay} onClick={onCancel}></div>
      <div className={styles.exitConfirmModal}>
        <h3>알림</h3>
        <p>정말로 나가시겠습니까?</p>
        <div className={styles.modalButtons}>
          <button className={styles.cancelButton} onClick={onCancel}>
            취소
          </button>
          <button className={styles.confirmButton} onClick={onConfirm}>
            나가기
          </button>
        </div>
      </div>
    </>
  );
};

export default QuizExitModal;
