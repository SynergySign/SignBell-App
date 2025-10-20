/**
 * @개요 방 번호 입력 모달 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @매개변수 {boolean} props.isOpen - 모달 열림 상태
 * @매개변수 {function} props.onClose - 모달 닫기 함수
 * @매개변수 {function} props.onSubmit - 방 검색 제출 함수
 * @반환값 {JSX.Element} 방 번호 입력 모달 컴포넌트
 */

import { useState } from 'react';
import './RoomSearchModal.scss';

const RoomSearchModal = ({ isOpen, onClose, onSubmit }) => {
  const [roomNumber, setRoomNumber] = useState('');

  const handleSubmit = () => {
    if (roomNumber.trim()) {
      onSubmit(roomNumber);
      setRoomNumber('');
      onClose();
    }
  };

  const handleClose = () => {
    setRoomNumber('');
    onClose();
  };

  const handleInputChange = (e) => {
    // 숫자만 입력 가능
    const value = e.target.value.replace(/[^0-9]/g, '');
    setRoomNumber(value);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div className="modal-overlay" onClick={handleClose}></div>

      {/* 모달 */}
      <div className={`room-search-modal ${isOpen ? 'open' : ''}`}>
        {/* 모달 헤더 */}
        <div className="modal-header">
          <h2 className="modal-title">방 번호 입력</h2>
          <button className="close-button" onClick={handleClose} aria-label="모달 닫기">
            ✕
          </button>
        </div>

        {/* 모달 바디 */}
        <div className="modal-body">
          <div className="input-label-container">
            <label htmlFor="room-number" className="input-label">
              방 번호
            </label>
            <span className="char-count">{roomNumber.length}/5</span>
          </div>
          <input
            id="room-number"
            type="text"
            inputMode="numeric"
            className="room-number-input"
            placeholder="방 번호를 입력하세요"
            value={roomNumber}
            onChange={handleInputChange}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && roomNumber.trim()) {
                handleSubmit();
              }
            }}
            maxLength={5}
          />
        </div>

        {/* 모달 푸터 */}
        <div className="modal-footer">
          <button
            className={`submit-button ${roomNumber.trim() ? 'active' : ''}`}
            onClick={handleSubmit}
            disabled={!roomNumber.trim()}
          >
            검색하기
          </button>
        </div>
      </div>
    </>
  );
};

export default RoomSearchModal;
