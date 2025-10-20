/**
 * @개요 실시간 퀴즈 사이드바 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @매개변수 {function} props.onClose - 사이드바 닫기 함수
 * @매개변수 {boolean} props.isOpen - 사이드바 열림 상태
 * @반환값 {JSX.Element} 실시간 퀴즈 사이드바 컴포넌트
 */

import { useState } from 'react';
import RoomCard from './RoomCard';
import CreateRoomModal from './CreateRoomModal';
import './RealTimeQuizSidebar.scss';

const RealTimeQuizSidebar = ({ onClose, isOpen }) => {
  const [activeTab, setActiveTab] = useState('quiz'); // 'personal' | 'quiz'
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [waitingRooms, setWaitingRooms] = useState([
    { id: 112399, title: '방 제목1', status: '진행 중', currentPlayers: 3, maxPlayers: 4 },
    { id: 21555, title: '방 제목2', status: '대기 중', currentPlayers: 1, maxPlayers: 4 },
    { id: 231111, title: '방 제목3', status: '대기 중', currentPlayers: 2, maxPlayers: 4 },
    { id: 998552, title: '방 제목4', status: '진행 중', currentPlayers: 4, maxPlayers: 4 },
    { id: 23516, title: '방 제목5', status: '대기 중', currentPlayers: 3, maxPlayers: 4 },
  ]); // TODO: 방 목록 API 연동 필요

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // TODO: 탭 전환 시 개인 학습 사이드바로 전환 필요
  };

  const handleRoomNumberInput = () => {
    // TODO: 방 번호 입력 모달 표시
    console.log('방 번호 입력 모달 열기');
  };

  const handleCreateRoom = () => {
    setIsCreateRoomModalOpen(true);
  };

  const handleCreateRoomSubmit = (roomTitle) => {
    // TODO: 방 생성 API 연동 필요
    console.log('방 생성:', roomTitle);
    // 임시로 새 방을 목록에 추가
    const newRoom = {
      id: Math.floor(Math.random() * 1000000),
      title: roomTitle,
      status: '대기 중',
      currentPlayers: 1,
      maxPlayers: 4,
    };
    setWaitingRooms([newRoom, ...waitingRooms]);
    // TODO: 방 생성 후 퀴즈 대기방으로 이동
  };

  const handleRoomClick = (roomId) => {
    // TODO: 방 참여 API 연동 및 퀴즈 대기방으로 이동
    console.log(`방 ${roomId} 참여`);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div className="sidebar-overlay" onClick={onClose}></div>

      {/* 사이드바 */}
      <div className={`real-time-quiz-sidebar ${isOpen ? 'open' : ''}`}>
        {/* 헤더 영역 */}
        <div className="sidebar-header">
          <h2 className="sidebar-title">실시간 퀴즈</h2>
          <button className="close-button" onClick={onClose} aria-label="사이드바 닫기">
            ✕
          </button>
        </div>

        {/* 탭 영역 */}
        <div className="sidebar-tabs">
          <button
            className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => handleTabChange('personal')}
          >
            개인 학습
          </button>
          <button
            className={`tab-button ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => handleTabChange('quiz')}
          >
            실시간 퀴즈
          </button>
        </div>

        {/* 대기 중인 방 개수 */}
        <div className="waiting-rooms-count">
          <p>대기중인 방이 {waitingRooms.filter(room => room.status === '대기 중').length}개 있습니다.</p>
        </div>

        {/* 버튼 영역 */}
        <div className="button-area">
          <button className="room-number-button" onClick={handleRoomNumberInput}>
            방 번호 입력
          </button>
          <button className="create-room-button" onClick={handleCreateRoom}>
            방 만들기
          </button>
        </div>

        {/* 방 목록 */}
        <div className="room-list">
          {waitingRooms.map((room) => (
            <RoomCard key={room.id} room={room} onClick={handleRoomClick} />
          ))}
        </div>
      </div>

      {/* 방 만들기 모달 */}
      <CreateRoomModal
        isOpen={isCreateRoomModalOpen}
        onClose={() => setIsCreateRoomModalOpen(false)}
        onSubmit={handleCreateRoomSubmit}
      />
    </>
  );
};

export default RealTimeQuizSidebar;
