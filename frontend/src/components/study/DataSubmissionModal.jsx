/**
 * @개요 영상 촬영 데이터 제공 안내 모달 컴포넌트입니다.
 * @작성자 신동준 (sdj3959)
 * @최종수정 백승현
 * @최종수정일 2025-10-26 (스피너, 폭죽, 성공 상태 UI 추가)
 */

import styles from './DataSubmissionModal.module.scss';

// 창 크기를 감지하는 간단한 커스텀 훅


const DataSubmissionModal = ({
                               isOpen,
                               onClose,
                               onRetake,
                               onSubmit,
                               isSaving,    // [추가] '제공 중' 로딩 상태
                               saveSuccess  // [추가] '제공 완료' 성공 상태
                             }) => {

  if (!isOpen) return null;

  // 로딩 스피너 컴포넌트
  const spinner = (
      <div className={styles.completionStatus}>
        <div className={styles.spinner}></div> {/* 스피너 CSS (다음 단계 참고) */}
        <h3 className={styles.completionMessage} style={{marginTop: '20px'}}>
          서버로 전송 중입니다...
        </h3>
        <p style={{marginTop: '10px', fontSize: '16px', opacity: 0.8}}>잠시만 기다려주세요.</p>
      </div>
  );

  // 성공 화면 컴포넌트
  const successScreen = (
      <>
        <div className={styles.completionStatus}>
          <div className={styles.completionDataIcon}>🎉</div>
          <h3 className={styles.completionMessage} style={{marginTop: '20px'}}>
            감사합니다.
          </h3>
          <p style={{marginTop: '10px', fontSize: '18px', opacity: 0.9}}>
            데이터 제공이 완료되었습니다!
          </p>
        </div>
      </>
  );

  // 기본 화면 컴포넌트
  const defaultScreen = (
      <>
        <div className={styles.completionStatus}>
          <div className={styles.completionIcon}>✓</div>
          <h3 className={styles.completionMessage}>녹화가 종료되었습니다.</h3>
        </div>
        <div className={styles.selectionGuide}>
          <p>수어 번역 AI 모델 개발에 도움을 주시려면 데이터 제공 버튼</p>
          <p>메인화면으로 가시려면 메인으로 버튼을 눌러주세요!</p>
        </div>
        <div className={styles.rewardInfo}>
          <div className={styles.rewardIcon}>🎁</div>
          <span>데이터 제공 시 10포인트 획득!</span>
        </div>
      </>
  );

  return (

      <>
        {/* [수정] 로딩 중(isSaving)에는 오버레이 클릭으로 닫히지 않도록 함
        [수정] 성공 시(saveSuccess)에는 오버레이 클릭으로 닫히도록 함 (onClose)
      */}
        <div
            className={styles.modalOverlay}
            onClick={isSaving ? undefined : onClose}
        ></div>

        {/* 모달 */}
        <div className={styles.dataSubmissionModal}>

          {/* 모달 헤더 */}
          <div className={styles.modalHeader}>
            <h2 className={styles.modalTitle}>
              {isSaving ? "데이터 제공 중" : (saveSuccess ? "전송 완료!" : "영상 촬영 데이터 제공 안내")}
            </h2>
            {/* [수정] 로딩 중에는 닫기 버튼 숨김 */}
            {!isSaving && (
                <button
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="모달 닫기"
                >
                  ✕
                </button>
            )}
          </div>

          {/* 모달 바디 (상태에 따라 분기) */}
          <div className={styles.modalBody}>
            {isSaving ? spinner : (saveSuccess ? successScreen : defaultScreen)}
          </div>

          {/* 모달 푸터 (상태에 따라 분기) */}
          <div className={styles.modalFooter}>
            {isSaving ? (
                <p style={{textAlign: 'center', width: '100%', opacity: 0.7}}>데이터 전송이 완료될 때까지 닫지 마세요.</p>
            ) : saveSuccess ? (
                <button
                    className={styles.submitButton}
                    onClick={onSubmit}
                >
                  메인으로
                </button>
            ) : (
                <>
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
                </>
            )}
          </div>
        </div>
      </>
  );
};

export default DataSubmissionModal;