/**
 * @개요 퀴즈 대기방 페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @반환값 {JSX.Element} 퀴즈 대기방 페이지 컴포넌트
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ParticipantCard from '../../components/quiz/ParticipantCard';
import AlertModal from '../../components/ui/AlertModal';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import styles from './QuizWaitingRoom.module.scss';

const QuizWaitingRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [showExitModal, setShowExitModal] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isCamOn, setIsCamOn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  // TODO: WebRTC 연동 필요
  // TODO: WebSocket 연동 필요

  // 임시 참여자 데이터 (추후 WebSocket으로 실시간 동기화)
  const [participants, setParticipants] = useState([
    {
      id: 1,
      nickname: '사용자1',
      profileImage: null,
      score: 1250,
      isHost: true,
      isReady: false,
      isCamOn: true,
      isMe: true,
    },
    {
      id: 2,
      nickname: '사용자2',
      profileImage: null,
      score: 980,
      isHost: false,
      isReady: true,
      isCamOn: true,
      isMe: false,
    },
  ]);

  const isHost = participants.find(p => p.isMe)?.isHost || false;
  const allReady = participants.filter(p => !p.isHost).every(p => p.isReady);
  const canStart = isHost && allReady && participants.length >= 2;

  // 초기 로딩 시뮬레이션 (실제로는 API 호출)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

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

  const handleExit = () => {
    setShowExitModal(true);
  };

  const confirmExit = () => {
    // TODO: 방 나가기 API 연동 필요
    navigate('/main');
  };

  const handleReadyToggle = () => {
    // 웹캠 검증
    if (!isCamOn) {
      showAlert(
        '웹캠 확인 필요',
        '게임을 시작하려면 웹캠을 켜주세요.',
        'warning'
      );
      return;
    }

    setIsReady(!isReady);
    // TODO: WebSocket으로 준비 상태 전송
  };

  const handleStartGame = () => {
    // 웹캠 검증
    if (!isCamOn) {
      showAlert(
        '웹캠 확인 필요',
        '게임을 시작하려면 웹캠을 켜주세요.',
        'warning'
      );
      return;
    }

    // 참여자 수 검증
    if (participants.length < 2) {
      showAlert(
        '참여자 부족',
        '게임을 시작하려면 최소 2명의 참여자가 필요합니다.',
        'warning'
      );
      return;
    }

    // 모든 참여자 준비 상태 검증
    if (!allReady) {
      showAlert(
        '준비 확인 필요',
        '모든 참여자가 준비 상태여야 게임을 시작할 수 있습니다.',
        'warning'
      );
      return;
    }

    if (canStart) {
      // TODO: WebSocket으로 게임 시작 신호 전송
      navigate(`/quiz/game/${roomId}`);
    }
  };

  const handleCamToggle = () => {
    setIsCamOn(!isCamOn);
    // TODO: WebRTC 카메라 on/off 처리
    
    if (!isCamOn) {
      showAlert(
        '웹캠 활성화',
        '웹캠이 활성화되었습니다.',
        'success'
      );
    }
  };

  return (
    <div className={styles.quizWaitingRoom}>
      {/* 방 정보 섹션 */}
      <div className={styles.roomInfoSection}>
        <div className={styles.roomInfo}>
          <span className={styles.roomNumber}>방 번호: #{roomId}</span>
          <h2 className={styles.roomTitle}>방 제목</h2>
        </div>
        <button className={styles.exitButton} onClick={handleExit}>
          나가기
        </button>
      </div>

      {/* 메인 콘텐츠 */}
      <main className={styles.waitingRoomContent}>
        {/* 캠 상태 툴팁 */}
        <div className={`${styles.camTooltip} ${isCamOn ? styles.on : styles.off}`}>
          {isCamOn ? 'CAM ON' : 'CAM OFF'}
        </div>

        {/* 준비/시작 버튼 */}
        <button 
          className={`${styles.actionButton} ${
            isHost ? (canStart ? styles.active : styles.disabled) : (isReady ? styles.active : styles.disabled)
          }`}
          onClick={isHost ? handleStartGame : handleReadyToggle}
          disabled={isHost && !canStart}
        >
          {isHost ? 'START' : (isReady ? 'READY' : 'READY')}
        </button>

        {/* 참여자 카드 영역 */}
        <div className={styles.participantsGrid}>
          {isLoading ? (
            // 로딩 중 스켈레톤 표시
            <>
              <SkeletonLoader variant="card" count={4} />
            </>
          ) : (
            <>
              {participants.map((participant, index) => (
                <ParticipantCard 
                  key={participant.id}
                  participant={participant}
                  index={index}
                />
              ))}
              {/* 빈 자리 카드 */}
              {[...Array(4 - participants.length)].map((_, index) => (
                <ParticipantCard 
                  key={`empty-${index}`}
                  isEmpty={true}
                  index={participants.length + index}
                />
              ))}
            </>
          )}
        </div>

        {/* 웹캠 설정 안내 툴팁 */}
        {!isCamOn && (
          <div className={styles.webcamWarning}>
            웹캠 설정이 완료되어야 합니다.
          </div>
        )}

        {/* 캠 토글 버튼 (테스트용) */}
        <button className={styles.camToggleButton} onClick={handleCamToggle}>
          {isCamOn ? '카메라 끄기' : '카메라 켜기'}
        </button>
      </main>

      {/* 나가기 확인 모달 */}
      {showExitModal && (
        <>
          <div className={styles.modalOverlay} onClick={() => setShowExitModal(false)}></div>
          <div className={styles.exitConfirmModal}>
            <h3>알림</h3>
            <p>정말로 나가시겠습니까?</p>
            <div className={styles.modalButtons}>
              <button className={styles.cancelButton} onClick={() => setShowExitModal(false)}>
                취소
              </button>
              <button className={styles.confirmButton} onClick={confirmExit}>
                나가기
              </button>
            </div>
          </div>
        </>
      )}

      {/* 알림 모달 */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
};

export default QuizWaitingRoom;
