/**
 * @개요 영상 촬영 데이터 제공 안내 모달 컴포넌트입니다.
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-01-21
 * @최종수정일 2025-01-21
 * @매개변수 {boolean} props.isOpen - 모달 열림/닫힘 상태입니다.
 * @매개변수 {function} props.onClose - 모달 닫기 함수입니다.
 * @매개변수 {function} props.onRetake - 재촬영 버튼 클릭 핸들러입니다.
 * @매개변수 {function} props.onSubmit - 제출 버튼 클릭 핸들러입니다.
 * @반환값 {JSX.Element} 데이터 제공 안내 모달 컴포넌트를 반환합니다.
 */

import styles from './DataSubmissionModal.module.scss';

const DataSubmissionModal = ({ isOpen, onClose, onRetake, onSubmit }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div className={styles.modalOverlay} onClick={onClose}></div>

      {/* 모달 */}
      <div className={styles.dataSubmissionModal}>
        {/* 모달 헤더 */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>영상 촬영 데이터 제공 안내</h2>
          <button 
            className={styles.closeButton} 
            onClick={onClose}
            aria-label="모달 닫기"
          >
            ✕
          </button>
        </div>

        {/* 모달 바디 */}
        <div className={styles.modalBody}>
          {/* 완료 상태 표시 */}
          <div className={styles.completionStatus}>
            <div className={styles.completionIcon}>✓</div>
            <h3 className={styles.completionMessage}>녹화가 종료되었습니다.</h3>
          </div>

          {/* 선택 안내 메시지 */}
          <div className={styles.selectionGuide}>
            <p>수어 번역 AI 모델 개발에 도움을 주시려면 데이터 제공 버튼</p>
            <p>메인화면으로 가시려면 메인으로 버튼을 눌러주세요!</p>
          </div>

          {/* 보상 안내 */}
          <div className={styles.rewardInfo}>
            <div className={styles.rewardIcon}>🎁</div>
            <span>영상 제공 시 10포인트 획득!</span>
          </div>
        </div>

        {/* 모달 푸터 */}
        <div className={styles.modalFooter}>
          <button 
            className={styles.retakeButton}
            onClick={onRetake}
          >
            데이터 제공
          </button>
          <button 
            className={styles.submitButton}
            onClick={onSubmit}
          >
            메인으로
          </button>
        </div>
      </div>
    </>
  );
};

export default DataSubmissionModal;