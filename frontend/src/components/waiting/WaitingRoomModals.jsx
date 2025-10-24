/**
 * @개요 대기방 모달 컴포넌트 (나가기 확인, 방 종료 알림)
 * @작성자 강관주
 * @작성일 2025-10-24
 */

import AlertModal from '../ui/AlertModal';
import styles from '../../pages/quiz/QuizWaitingRoom.module.scss';

const WaitingRoomModals = ({ 
  showExitModal, 
  showRoomClosedAlert,
  onCancelExit,
  onConfirmExit,
  onRoomClosedAlertClose 
}) => {
  return (
    <>
      {/* 나가기 확인 모달 */}
      {showExitModal && (
        <>
          <div className={styles.modalOverlay} onClick={onCancelExit}></div>
          <div className={styles.exitConfirmModal}>
            <h3>알림</h3>
            <p>정말로 나가시겠습니까?</p>
            <div className={styles.modalButtons}>
              <button className={styles.cancelButton} onClick={onCancelExit}>
                취소
              </button>
              <button className={styles.confirmButton} onClick={onConfirmExit}>
                나가기
              </button>
            </div>
          </div>
        </>
      )}

      {/* 방 종료 알림 모달 */}
      <AlertModal
        isOpen={showRoomClosedAlert}
        onClose={onRoomClosedAlertClose}
        title="방 종료"
        message="방장이 나가서 방이 종료되었습니다."
        type="warning"
      />
    </>
  );
};

export default WaitingRoomModals;
