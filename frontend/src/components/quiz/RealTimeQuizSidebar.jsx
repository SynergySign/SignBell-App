/**
 * @개요 실시간 퀴즈 사이드바 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @매개변수 {function} props.onClose - 사이드바 닫기 함수
 * @매개변수 {boolean} props.isOpen - 사이드바 열림 상태
 * @반환값 {JSX.Element} 실시간 퀴즈 사이드바 컴포넌트
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import RoomCard from './RoomCard';
import CreateRoomModal from './CreateRoomModal';
import RoomSearchModal from './RoomSearchModal';
import AlertModal from '../ui/AlertModal';
import SkeletonLoader from '../ui/SkeletonLoader';
import styles from './RealTimeQuizSidebar.module.scss';

const RealTimeQuizSidebar = ({ onClose, isOpen }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('quiz'); // 'personal' | 'quiz'
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [isRoomSearchModalOpen, setIsRoomSearchModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });
  const [waitingRooms, setWaitingRooms] = useState([
    { id: 112399, title: '방 제목1', status: '진행 중', currentPlayers: 3, maxPlayers: 4 },
    { id: 21555, title: '방 제목2', status: '대기 중', currentPlayers: 1, maxPlayers: 4 },
    { id: 231111, title: '방 제목3', status: '대기 중', currentPlayers: 2, maxPlayers: 4 },
    { id: 998552, title: '방 제목4', status: '진행 중', currentPlayers: 4, maxPlayers: 4 },
    { id: 23516, title: '방 제목5', status: '대기 중', currentPlayers: 3, maxPlayers: 4 },
  ]); // TODO: 방 목록 API 연동 필요

  // 방 목록 로딩 시뮬레이션
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const showAlert = (title, message, type = 'info') => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const closeAlert = () => {
    setAlertModal({
      ...alertModal,
      isOpen: false
    });
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // TODO: 탭 전환 시 개인 학습 사이드바로 전환 필요
  };

  const handleRoomNumberInput = () => {
    setIsRoomSearchModalOpen(true);
  };

  const handleRoomSearchSubmit = (roomNumber) => {
    // TODO: 방 번호로 방 검색 API 연동 필요
    console.log('방 검색:', roomNumber);
    // 임시로 해당 방 번호로 이동
    navigate(`/quiz/waiting/${roomNumber}`);
    onClose();
  };

  const handleCreateRoom = () => {
    setIsCreateRoomModalOpen(true);
  };

  const handleCreateRoomSubmit = (roomTitle) => {
    // TODO: 방 생성 API 연동 필요
    console.log('방 생성:', roomTitle);
    // 임시로 새 방을 목록에 추가
    const newRoomId = Math.floor(Math.random() * 100000);
    const newRoom = {
      id: newRoomId,
      title: roomTitle,
      status: '대기 중',
      currentPlayers: 1,
      maxPlayers: 4,
    };
    setWaitingRooms([newRoom, ...waitingRooms]);
    // 방 생성 후 퀴즈 대기방으로 이동
    navigate(`/quiz/waiting/${newRoomId}`);
    onClose();
  };

  const handleRoomClick = (roomId) => {
    const room = waitingRooms.find(r => r.id === roomId);
    
    // 방이 가득 찬 경우
    if (room && room.currentPlayers >= room.maxPlayers) {
      showAlert(
        '입장 불가',
        '방이 가득 찼습니다. 다른 방을 선택해주세요.',
        'warning'
      );
      return;
    }

    // 진행 중인 방인 경우
    if (room && room.status === '진행 중') {
      showAlert(
        '입장 불가',
        '이미 게임이 진행 중인 방입니다.',
        'warning'
      );
      return;
    }

    // TODO: 방 참여 API 연동 필요
    console.log(`방 ${roomId} 참여`);
    // 퀴즈 대기방으로 이동
    navigate(`/quiz/waiting/${roomId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 오버레이 */}
      <div className={styles.sidebarOverlay} onClick={onClose}></div>

      {/* 사이드바 */}
      <div className={`${styles.realTimeQuizSidebar} ${isOpen ? styles.open : ''}`}>
        {/* 헤더 영역 */}
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>실시간 퀴즈</h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="사이드바 닫기">
            ✕
          </button>
        </div>

        {/* 탭 영역 */}
        <div className={styles.sidebarTabs}>
          <button
            className={`${styles.tabButton} ${activeTab === 'personal' ? styles.active : ''}`}
            onClick={() => handleTabChange('personal')}
          >
            개인 학습
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'quiz' ? styles.active : ''}`}
            onClick={() => handleTabChange('quiz')}
          >
            실시간 퀴즈
          </button>
        </div>

        {/* 대기 중인 방 개수 */}
        <div className={styles.waitingRoomsCount}>
          <p>대기중인 방이 {waitingRooms.filter(room => room.status === '대기 중').length}개 있습니다.</p>
        </div>

        {/* 버튼 영역 */}
        <div className={styles.buttonArea}>
          <button className={styles.roomNumberButton} onClick={handleRoomNumberInput}>
            방 번호 입력
          </button>
          <button className={styles.createRoomButton} onClick={handleCreateRoom}>
            방 만들기
          </button>
        </div>

        {/* 방 목록 */}
        <div className={styles.roomList}>
          {isLoading ? (
            // 로딩 중 스켈레톤 표시
            <div className={styles.skeletonWrapper}>
              {[...Array(5)].map((_, index) => (
                <div key={index} className={styles.skeletonCard}>
                  <SkeletonLoader variant="rectangle" width={350} height={60} />
                </div>
              ))}
            </div>
          ) : waitingRooms.length > 0 ? (
            waitingRooms.map((room) => (
              <RoomCard key={room.id} room={room} onClick={handleRoomClick} />
            ))
          ) : (
            <div className={styles.emptyState}>
              <p>대기 중인 방이 없습니다.</p>
              <p className={styles.emptySubtext}>새로운 방을 만들어보세요!</p>
            </div>
          )}
        </div>
      </div>

      {/* 방 만들기 모달 */}
      <CreateRoomModal
        isOpen={isCreateRoomModalOpen}
        onClose={() => setIsCreateRoomModalOpen(false)}
        onSubmit={handleCreateRoomSubmit}
      />

      {/* 방 번호 입력 모달 */}
      <RoomSearchModal
        isOpen={isRoomSearchModalOpen}
        onClose={() => setIsRoomSearchModalOpen(false)}
        onSubmit={handleRoomSearchSubmit}
      />

      {/* 알림 모달 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </>
  );
};

export default RealTimeQuizSidebar;
