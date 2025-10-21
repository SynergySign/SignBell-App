/**
 * @개요 방 만들기 모달 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-21
 * @매개변수 {boolean} props.isOpen - 모달 열림 상태
 * @매개변수 {function} props.onClose - 모달 닫기 함수
 * @매개변수 {function} props.onSubmit - 방 생성 제출 함수
 * @매개변수 {function} props.loading - 방 생성 중 로딩 상태
 * @매개변수 {function} props.error - 방 생성 에러 메시지
 * @반환값 {JSX.Element} 방 만들기 모달 컴포넌트
 */

import {useEffect, useState} from 'react';
import styles from './CreateRoomModal.module.scss';

const CreateRoomModal = ({ isOpen, onClose, onSubmit, loading = false, error = null }) => {
  const [roomTitle, setRoomTitle] = useState('');

  // 모달이 열릴 때마다 입력값 초기화
  useEffect(() => {
    if (isOpen) {
      setRoomTitle('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (roomTitle.trim() && !loading) {
      // onSubmit이 Promise를 반환하므로 await
      const success = await onSubmit(roomTitle);

      // 성공한 경우에만 입력값 초기화
      if (success) {
        setRoomTitle('');
      }
      // 실패한 경우 모달은 열린 채로 유지하여 에러 메시지 표시
    }
  };

  const handleClose = () => {
    if (!loading) {
      setRoomTitle('');
      onClose();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    // 20자 이하로 제한
    if (value.length <= 20) {
      setRoomTitle(value);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div
        className={styles.modalOverlay}
        onClick={handleClose}
        style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
      >

      </div>

      {/* 모달 */}
      <div className={`${styles.createRoomModal} ${isOpen ? styles.open : ''}`}>
        {/* 모달 헤더 */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>방 만들기</h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="모달 닫기"
            disabled={loading}
            style={{ cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* 모달 바디 */}
        <div className={styles.modalBody}>
          <div className={styles.inputLabelContainer}>
            <label htmlFor="room-title" className={styles.inputLabel}>
              방 제목
            </label>
            <span className={styles.charCount}>{roomTitle.length}/20</span>
          </div>
          <input
            id="room-title"
            type="text"
            className={styles.roomTitleInput}
            placeholder="방 제목을 입력하세요"
            value={roomTitle}
            onChange={handleInputChange}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && roomTitle.trim() && !loading) { // 로딩중이 아닐 때만 엔터로 제출 가능
                handleSubmit();
              }
            }}
            disabled={loading}
            autoFocus
          />

          {/* 에러 메시지 표시 */}
          {error && (
            <div>
            {/*<div className={styles.errorMessage}>*/}
              {error}
            </div>
          )}

        </div>

        {/* 모달 푸터 */}
        <div className={styles.modalFooter}>
          <button
            className={`${styles.submitButton} ${roomTitle.trim() ? styles.active : ''}`}
            onClick={handleSubmit}
            disabled={!roomTitle.trim() || loading}
          >
            {loading ? '생성 중...' : '생성하기'}
          </button>
        </div>
      </div>
    </>
  );
};

export default CreateRoomModal;
