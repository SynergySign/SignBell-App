/**
 * @개요 실시간 퀴즈 사이드바 컴포넌트
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-10-20
 * @최종수정일 2025-10-21
 * @매개변수 {function} props.onClose - 사이드바 닫기 함수
 * @매개변수 {boolean} props.isOpen - 사이드바 열림 상태
 * @반환값 {JSX.Element} 실시간 퀴즈 사이드바 컴포넌트
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import RoomCard from './RoomCard';
import CreateRoomModal from './CreateRoomModal';
import RoomSearchModal from './RoomSearchModal';
import AlertModal from '../ui/AlertModal';
import SkeletonLoader from '../ui/SkeletonLoader';
import styles from './RealTimeQuizSidebar.module.scss';
import { RoomService } from '../../services/api/roomService.js';

const RealTimeQuizSidebar = ({ onClose, isOpen, onTabChange }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('quiz'); // 'personal' | 'quiz'
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [isRoomSearchModalOpen, setIsRoomSearchModalOpen] = useState(false);

  // 방 목록 관련 상태
  // TODO: 방 목록 API 연동 필요
  // ✅ 2025-10-21 완료 (강관주)
  const [waitingRooms, setWaitingRooms] = useState([]);
  // 초기 로딩 상태 - 처음 방 목록을 불러올 때 true
  const [isLoading, setIsLoading] = useState(true);
  // 추가 로딩 상태 - 스크롤해서 더 불러올 때 true (무한 스크롤용)
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  // 다음 페이지 존재 여부 - API의 hasNext 값 저장
  const [hasMore, setHasMore] = useState(true);
  // 현재 페이지 번호 - 0부터 시작
  const [currentPage, setCurrentPage] = useState(0);
  const [error, setError] = useState(null);

  // 방 생성 관련 상태
  const [createRoomLoading, setCreateRoomLoading] = useState(false);
  const [createRoomError, setCreateRoomError] = useState(null);

  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  // Intersection Observer를 위한 ref, 이 요소가 화면에 보이면 다음 페이지를 로드
  const observerTarget = useRef(null);

  // ============================================
  // 📌 방 목록 불러오기 함수
  // ============================================
  /**
   * 방 목록을 API에서 가져오는 함수
   *
   * @param {number} page - 불러올 페이지 번호 (0부터 시작)
   * @param {boolean} isInitial - 초기 로딩인지 여부
   *   - true: 처음 로딩 (기존 목록 초기화)
   *   - false: 추가 로딩 (기존 목록에 추가)
   *
   * useCallback: 이 함수가 불필요하게 재생성되지 않도록 메모이제이션
   * - navigate가 바뀔 때만 함수 재생성
   */
  const fetchRoomList = useCallback(async (page = 0, isInitial = false) => {
    // 초기 로딩이면 isLoading, 추가 로딩이면 isLoadingMore
    if (isInitial) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null); // 에러 초기화

    try {
      // API 호출 - 페이지당 13개씩 요청
      const data = await RoomService.getRoomList(page, 13);

      // 최소 1000ms 동안은 스켈레톤이 유지되게끔 setTimeout 사용
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 초기 로딩: 기존 목록을 새 데이터로 교체
      // 추가 로딩: 기존 목록 뒤에 새 데이터 추가
      if (isInitial) {
        setWaitingRooms(data.roomList);
      } else {
        setWaitingRooms(prev => [...prev, ...data.roomList]);
      }

      // API 응답의 hasNext 값 저장
      // true면 아직 더 불러올 데이터가 있음
      setHasMore(data.hasNext);

      // 현재 페이지 번호 저장
      setCurrentPage(page);
    } catch (err) {
      console.error('방 목록 조회 실패:', err);
      setError('방 목록을 불러오는데 실패했습니다.');

      // 401 에러 (인증 실패)면 로그인 페이지로 이동
      if (err.response?.status === 401) {
        showAlert('로그인 필요', '로그인이 필요합니다.', 'warning');
        setTimeout(() => navigate('/'), 2000);
      }
    } finally {
      // 성공이든 실패든 로딩 상태 끄기
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [navigate]); // navigate가 바뀔 때만 함수 재생성

  /**
   * 사이드바가 열릴 때마다 실행
   * - 방 목록 초기화
   * - 첫 페이지(0번) 로드
   */
  useEffect(() => {
    if (isOpen) {
      setActiveTab('quiz'); // 실시간 퀴즈 사이드바가 열릴 때 실시간 퀴즈 탭 활성화
      setWaitingRooms([]);      // 방 목록 비우기
      setCurrentPage(0);        // 페이지 0으로 초기화
      setHasMore(true);         // 더 불러올 데이터 있음으로 설정
      fetchRoomList(0, true);   // 첫 페이지 로드 (isInitial=true)
    }
  }, [isOpen, fetchRoomList]); // isOpen이나 fetchRoomList가 바뀔 때 실행

  // ============================================
  // 📌 Effect: Intersection Observer 설정 (무한 스크롤)
  // ============================================
  /**
   * Intersection Observer란?
   * - 특정 요소가 화면에 보이는지 감지하는 브라우저 API
   * - 여기서는 마지막 방 카드 아래의 빈 div를 감지
   * - 이 div가 화면에 보이면 = 사용자가 스크롤해서 끝까지 내려왔다
   * - 그러면 다음 페이지를 자동으로 로드
   *
   * 무한 스크롤 원리:
   * 1. 방 목록 끝에 보이지 않는 div 배치 (observerTarget)
   * 2. 사용자가 스크롤하다가 이 div가 화면에 보임
   * 3. Observer가 감지 → 다음 페이지 로드
   * 4. 새로운 방들이 추가됨
   * 5. 반복...
   */
  useEffect(() => {
    // 조건: 사이드바가 열려있고, 더 불러올 데이터가 있고, 로딩 중이 아닐 때만 실행
    if (!isOpen || !hasMore || isLoading || isLoadingMore) return;

    // Intersection Observer 생성
    const observer = new IntersectionObserver(
      (entries) => {
        // entries[0]: 감시 중인 요소 (observerTarget)
        // isIntersecting: 요소가 화면에 보이는지 여부
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          // 화면에 보이면 다음 페이지 로드
          // currentPage + 1: 다음 페이지 번호
          // isInitial=false: 추가 로딩 (기존 목록에 추가)
          fetchRoomList(currentPage + 1, false);
        }
      },
      {
        threshold: 0.1  // 요소의 10%만 보여도 감지 (더 빨리 로드하기 위해)
      }
    );

    // 현재 observerTarget ref에 저장된 DOM 요소
    const currentTarget = observerTarget.current;

    // 요소가 존재하면 감시 시작
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    // cleanup 함수: 컴포넌트가 언마운트되거나 의존성이 바뀔 때 실행
    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget); // 감시 중지
      }
    };
  }, [isOpen, hasMore, isLoading, isLoadingMore, currentPage, fetchRoomList]);
  // 위 값들이 바뀔 때마다 Observer 재설정

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

  // ============================================
  // 📌 탭 변경
  // ============================================
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // 메인페이지의 사이드바 상태 변경
    if (onTabChange) {
      onTabChange(tab);
    }
  };
  
  // ============================================
  // 📌 방 번호 입력
  // ============================================
  // 방 번호 입력 모달 열기
  const handleRoomNumberInput = () => {
    setIsRoomSearchModalOpen(true);
  };

  // 방 번호로 방 입장 - WebSocket 세션 체크 후 입장
  const handleRoomSearchSubmit = async (roomNumber) => {
    console.log('방 검색:', roomNumber);
    // TODO: 방 번호로 방 검색 API 연동 필요

    // 기본 입력 검증
    if (!roomNumber || isNaN(roomNumber)) {
      showAlert('입력 오류', '방 번호는 숫자만 입력할 수 있습니다.', 'warning');
      return;
    }

    // 세션 체크: 이미 다른 탭에서 게임 중인지 확인
    try {
      const sessionStatus = await RoomService.checkWsSession();

      // active=true: 이미 다른 탭에서 WebSocket 연결 중
      if (sessionStatus.active) {
        showAlert(
          '입장 불가',
          '이미 다른 탭에서 게임에 참여 중입니다. 기존 탭을 종료해주세요.',
          'warning'
        );
        return; // 입장 불가
      }

      // 방 상세 조회 API 호출 (유효성 검증)
      const roomDetail = await RoomService.getRoomDetail(roomNumber);

      if (!roomDetail || !roomDetail.gameRoomId) {
        showAlert('방을 찾을 수 없습니다.', '존재하지 않는 방 번호입니다.', 'error');
        return;
      }

      // 상태 검증
      if (roomDetail.status === 'IN_PROGRESS') {
        showAlert('입장 불가', '이미 게임이 진행 중인 방입니다.', 'warning');
        return;
      }
      if (roomDetail.status === 'FINISHED') {
        showAlert('입장 불가', '종료된 방은 입장할 수 없습니다.', 'warning');
        return;
      }

      // 모든 조건 통과 → 입장
      navigate(`/quiz/waiting/${roomNumber}`);
      onClose(); // 사이드바 닫기
    } catch (err) {
      console.error('방 번호 검증 실패:', err);

      const errorCode = err.response?.data?.error;

      if (errorCode === 'ROOM_NOT_FOUND') {
        showAlert('입장 불가', '해당 방을 찾을 수 없습니다.', 'error');
      } else if (errorCode === 'UNAUTHORIZED') {
        showAlert('로그인 필요', '로그인이 필요합니다.', 'warning');
        setTimeout(() => navigate('/'), 2000);
      } else {
        showAlert('오류', '방 검증 중 오류가 발생했습니다.', 'error');
      }
    }
  };
  
  // ============================================
  // 📌 방 만들기
  // ============================================
  const handleCreateRoom = () => {
    setIsCreateRoomModalOpen(true);
  };

  // 방 생성 제출 함수, 2초 로딩
  const handleCreateRoomSubmit = async (roomTitle) => {
    // TODO: 방 생성 API 연동 필요
    // ✅ 2025-10-21 완료 (강관주)

    console.log('방 생성:', roomTitle);

    setCreateRoomLoading(true);
    setCreateRoomError(null);

    try {
      // ========== 세션 체크: 이미 다른 탭에서 게임 중인지 확인 ==========
      const sessionStatus = await RoomService.checkWsSession();

      if (sessionStatus.active) {
        setCreateRoomLoading(false);
        setCreateRoomError('이미 다른 탭에서 게임에 참여 중입니다. 기존 탭을 종료해주세요.');
        return false;
      }

      // API 호출
      const result = await RoomService.createRoom(roomTitle);

      console.log('방 생성 성공:', result);

      // 방 생성 후 퀴즈 대기방으로 2초 후 이동
      setTimeout(() => {
        // 방 생성 로딩 종료, 모달 닫기
        setCreateRoomLoading(false);
        setIsCreateRoomModalOpen(false);
        
        navigate(`/quiz/waiting/${result.gameRoomId}`);
        onClose();
      }, 2000);

      // 성공 반환 (모달 유지)
      return true;
    } catch (err) {

      console.error('방 생성 중 오류:', err);

      setCreateRoomLoading(false); // 방 생성 에러 시에는 즉시 로딩 끝

      // 에러 처리
      const errorCode = err.response?.data?.error;
      const errorMessage = err.response?.data?.detail;

      switch (errorCode) {
        case 'VALIDATION_ERROR':
          setCreateRoomError(errorMessage || '방 제목을 확인해주세요.');
          break;
        case 'PARTICIPANT_ALREADY_IN_ROOM':
          setCreateRoomError('이미 다른 방에 참여 중입니다.');
          break;
        case 'USER_NOT_FOUND':
          setCreateRoomError('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
          break;
        case 'UNAUTHORIZED':
          setCreateRoomError('로그인이 필요합니다.');
          // 로그인 페이지로 이동
          setTimeout(() => navigate('/'), 2000);
          break;
        default:
          setCreateRoomError('방 생성에 실패했습니다. 다시 시도해주세요.');
      }
      return false; // 실패 반환 (모달 유지, 에러 표시)
    }
  }

  // ============================================
  // 📌 방 클릭 (세션 체크 포함)
  // ============================================
  /**
   * 방 카드 클릭 시 입장 처리
   *
   * 입장 조건 체크:
   * 1. 방이 가득 찼는지
   * 2. 이미 진행 중인지
   * 3. 다른 탭에서 게임 중인지 (WebSocket 세션)
   */
  const handleRoomClick = async (roomId) => {
    // 클릭한 방 정보 찾기
    const room = waitingRooms.find(r => r.gameRoomId === roomId);

    // ========== 조건 1: 방이 가득 찼는지 체크 ==========
    if (room && room.currentPlayers >= room.maxPlayers) {
      showAlert(
        '입장 불가',
        '방이 가득 찼습니다. 다른 방을 선택해주세요.',
        'warning'
      );
      return;
    }

    // ========== 조건 2: 이미 진행 중인지 체크 ==========
    if (room && room.status === '진행 중') {
      showAlert(
        '입장 불가',
        '이미 게임이 진행 중인 방입니다.',
        'warning'
      );
      return;
    }

    // ========== 조건 3: WebSocket 세션 체크 ==========
    // 다른 탭에서 이미 게임 중인지 확인
    try {
      const sessionStatus = await RoomService.checkWsSession();

      // active=true: 다른 탭에서 WebSocket 연결 중
      if (sessionStatus.active) {
        showAlert(
          '입장 불가',
          '이미 다른 탭에서 게임에 참여 중입니다. 기존 탭을 종료해주세요.',
          'warning'
        );
        return;
      }

      // 모든 조건 통과 → 입장 허용
      console.log(`방 ${roomId} 참여`);
      navigate(`/quiz/waiting/${roomId}`);
      onClose();
    } catch (err) {
      console.error('세션 체크 실패:', err);
      showAlert(
        '오류',
        '입장 확인 중 오류가 발생했습니다. 다시 시도해주세요.',
        'error'
      );
    }
    // TODO: 방 참여 API 연동 필요
    // ✅ 2025-10-21 완료 (강관주)
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
          <p>대기중인 방이 {waitingRooms.filter(room => room.status === 'WAITING').length}개 있습니다.</p>
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
          ) : !error && waitingRooms.length > 0 ? (
            <>
              {/* ---------- 방 목록이 있을 때 모임 렌더링 ---------- */}
              {waitingRooms.map((room) => (
                <RoomCard key={room.gameRoomId} room={room} onClick={handleRoomClick} />
              ))}

              {/* ---------- 추가 로딩 중 (스켈레톤 표시 2개) ---------- */}
              {isLoadingMore && (
                <div className={styles.skeletonWrapper}>
                  {[...Array(2)].map((_, index) => (
                    <div key={index} className={styles.skeletonCard}>
                      <SkeletonLoader variant="rectangle" width={350} height={60} />
                    </div>
                  ))}
                </div>
              )}

              {/*
                ========== Intersection Observer 타겟 ==========
                이 div가 화면에 보이면 다음 페이지 로드
                - ref={observerTarget}: DOM 요소 참조 저장
                - hasMore가 true일 때만 렌더링
                - isLoadingMore가 false일 때만 렌더링 (중복 로드 방지)
              */}
              {hasMore && !isLoadingMore && (
                <div
                  ref={observerTarget}
                  style={{ height: '20px' }} // 높이 20px의 보이지 않는 영역
                />
              )}

            </>
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
        onClose={() => {
          setIsCreateRoomModalOpen(false);
          setCreateRoomError(null); // 에러 초기화
        }}
        onSubmit={handleCreateRoomSubmit}
        loading={createRoomLoading}
        error={createRoomError}
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
