/**
 * @개요 퀴즈 대기방 페이지 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-20
 * @반환값 {JSX.Element} 퀴즈 대기방 페이지 컴포넌트
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useWebcam from '../../hooks/useWebcam';
import styles from './QuizWaitingRoom.module.scss';

const QuizWaitingRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [isHost, setIsHost] = useState(false); // 방장 여부
  const [isReady, setIsReady] = useState(false); // 준비 상태
  const [showExitModal, setShowExitModal] = useState(false);

  // 웹캠 관리
  const {
    stream,
    isWebcamOn,
    error: webcamError,
    videoRef,
    startWebcam,
    stopWebcam,
    toggleWebcam
  } = useWebcam();

  // 임시 참가자 데이터 (실제로는 WebSocket에서 받음)
  const [participants] = useState([
    { 
      id: 1, 
      nickname: '사용자1', 
      score: 1250, 
      isMe: true, 
      isHost: false, 
      isReady: false,
      webcamStatus: 'on' // 'on', 'off', 'denied'
    },
    { 
      id: 2, 
      nickname: '사용자2', 
      score: 980, 
      isMe: false, 
      isHost: true, 
      isReady: true,
      webcamStatus: 'on'
    },
    { 
      id: 3, 
      nickname: '사용자3', 
      score: 1100, 
      isMe: false, 
      isHost: false, 
      isReady: false,
      webcamStatus: 'off'
    },
    { 
      id: 4, 
      nickname: '사용자4', 
      score: 850, 
      isMe: false, 
      isHost: false, 
      isReady: true,
      webcamStatus: 'denied'
    },
  ]);

  // 웹캠 권한 요청
  const handleWebcamRequest = async () => {
    try {
      await startWebcam();
    } catch (error) {
      console.error('웹캠 권한 거부:', error);
    }
  };

  // 준비 상태 토글
  const handleReadyToggle = () => {
    setIsReady(!isReady);
    // TODO: WebSocket으로 준비 상태 전송
  };

  // 게임 시작 (방장만)
  const handleStartGame = () => {
    // TODO: WebSocket으로 게임 시작 전송
    navigate(`/quiz/game/${roomId}`);
  };

  // 방 나가기
  const handleExit = () => {
    setShowExitModal(true);
  };

  const confirmExit = () => {
    // TODO: WebSocket으로 방 나가기 전송
    navigate('/main');
  };

  // 웹캠 상태 아이콘 색상
  const getWebcamStatusColor = (status) => {
    switch (status) {
      case 'on': return 'var(--info-color)';
      case 'off': return '#999999';
      case 'denied': return 'var(--error-color)';
      default: return '#999999';
    }
  };

  // 웹캠 상태 툴팁 텍스트
  const getWebcamStatusText = (status) => {
    switch (status) {
      case 'on': return 'CAM ON';
      case 'off': return 'CAM OFF';
      case 'denied': return 'CAM DENIED';
      default: return 'CAM OFF';
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
      <main className={styles.waitingContent}>
        {/* 캠 상태 툴팁 */}
        <div className={styles.camStatusTooltip}>
          <span style={{ color: getWebcamStatusColor(isWebcamOn ? 'on' : webcamError ? 'denied' : 'off') }}>
            {getWebcamStatusText(isWebcamOn ? 'on' : webcamError ? 'denied' : 'off')}
          </span>
        </div>

        {/* 준비/시작 버튼 */}
        <button 
          className={`${styles.actionButton} ${
            isHost ? styles.startButton : (isReady ? styles.readyActive : styles.readyInactive)
          }`}
          onClick={isHost ? handleStartGame : handleReadyToggle}
        >
          {isHost ? 'START' : (isReady ? 'READY' : 'NOT READY')}
        </button>

        {/* 참가자 카드 영역 */}
        <div className={styles.participantsGrid}>
          {participants.map((participant) => (
            <div key={participant.id} className={styles.participantCard}>
              {/* 캠 상태 점 */}
              <div 
                className={styles.camStatusDot}
                style={{ backgroundColor: getWebcamStatusColor(participant.webcamStatus) }}
                title={getWebcamStatusText(participant.webcamStatus)}
              ></div>

              {/* 방장 표시 */}
              {participant.isHost && (
                <span className={styles.hostBadge}>방장</span>
              )}

              {/* 웹캠 영역 */}
              <div className={styles.webcamArea}>
                {participant.isMe && isWebcamOn ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={styles.webcamVideo}
                  />
                ) : (
                  <div className={styles.webcamPlaceholder}>
                    <span>웹캠</span>
                  </div>
                )}
              </div>

              {/* 참가자 정보 */}
              <div className={styles.participantInfo}>
                <span className={styles.nickname}>
                  {participant.nickname}{participant.isMe ? ' (나)' : ''}
                </span>
                <span className={styles.score}>💰 {participant.score}</span>
              </div>

              {/* READY 표시 */}
              {participant.isReady && (
                <div className={styles.readyBadge}>READY</div>
              )}

              {/* 웹캠 제어 버튼 (본인만) */}
              {participant.isMe && (
                <button 
                  className={styles.webcamToggle}
                  onClick={isWebcamOn ? stopWebcam : handleWebcamRequest}
                >
                  {isWebcamOn ? '웹캠 끄기' : '웹캠 켜기'}
                </button>
              )}
            </div>
          ))}

          {/* 빈 자리 카드들 */}
          {Array.from({ length: 4 - participants.length }, (_, index) => (
            <div key={`empty-${index}`} className={styles.emptyCard}>
              <span>대기중</span>
            </div>
          ))}
        </div>

        {/* 테스트 버튼들 */}
        <div className={styles.testButtons}>
          <button 
            className={styles.testButton}
            onClick={() => setIsHost(!isHost)}
          >
            {isHost ? '참여자로 전환' : '방장으로 전환'}
          </button>
          <button 
            className={styles.testButton}
            onClick={handleReadyToggle}
          >
            준비 상태 토글
          </button>
          <button 
            className={styles.testButton}
            onClick={() => navigate(`/quiz/game/${roomId}`)}
          >
            게임 시작 (테스트)
          </button>
        </div>
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
    </div>
  );
};

export default QuizWaitingRoom;