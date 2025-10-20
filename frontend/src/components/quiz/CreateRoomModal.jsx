/**
 * @개요 방 만들기 모달 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @매개변수 {boolean} props.isOpen - 모달 열림 상태
 * @매개변수 {function} props.onClose - 모달 닫기 함수
 * @매개변수 {function} props.onSubmit - 방 생성 제출 함수
 * @반환값 {JSX.Element} 방 만들기 모달 컴포넌트
 */

import { useState } from 'react';
import './CreateRoomModal.scss';

const CreateRoomModal = ({ isOpen, onClose, onSubmit }) => {
  const [roomTitle, setRoomTitle] = useState('');

  const handleSubmit = () => {
    if (roomTitle.trim()) {
      onSubmit(roomTitle);
      setRoomTitle('');
      onClose();
    }
  };

  const handleClose = () => {
    setRoomTitle('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div className="modal-overlay" onClick={handleClose}></div>

      {/* 모달 */}
      <div className={`create-room-modal ${isOpen ? 'open' : ''}`}>
        {/* 모달 헤더 */}
        <div className="modal-header">
          <h2 className="modal-title">방 만들기</h2>
          <button className="close-button" onClick={handleClose} aria-label="모달 닫기">
            ✕
          </button>
        </div>

        {/* 모달 바디 */}
        <div className="modal-body">
          <label htmlFor="room-title" className="input-label">
            방 제목
          </label>
          <input
            id="room-title"
            type="text"
            className="room-title-input"
            placeholder="방 제목을 입력하세요"
            value={roomTitle}
            onChange={(e) => setRoomTitle(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && roomTitle.trim()) {
                handleSubmit();
              }
            }}
            maxLength={20}
          />
        </div>

        {/* 모달 푸터 */}
        <div className="modal-footer">
          <button
            className={`submit-button ${roomTitle.trim() ? 'active' : ''}`}
            onClick={handleSubmit}
            disabled={!roomTitle.trim()}
          >
            생성하기
          </button>
        </div>
      </div>
    </>
  );
};

export default CreateRoomModal;
