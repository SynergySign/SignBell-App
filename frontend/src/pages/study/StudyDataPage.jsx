/**
 * @개요 수어 연습 영상 데이터 제공 페이지 (useWebcam + WS 전송)
 * @작성자 신동준 (sdj3959)
 * @최종수정 (Gemini)
 * @최종수정일 2025-10-26 (작동하는 useWebcam 훅 + WS 로직 + 로딩 가드 추가)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../../components/ui/VideoPlayer';
import DataSubmissionModal from '../../components/study/DataSubmissionModal';
import styles from './StudyDataPage.module.scss';
import { getSignDetail } from '../../services/signEdu/signEdu.js';

// [변경] 작동이 검증된 useWebcam 훅을 다시 사용
import useWebcam from '../../hooks/useWebcam';

// [유지] 웹소켓 서비스는 그대로 사용
import {
  connect as wsConnect,
  disconnect as wsDisconnect,
  sendMeta as wsSendMeta,
  sendFrame as wsSendFrame,
  sendSaveLearning as wsSendSaveLearning,
  onStatus as wsOnStatus,
  onMessage as wsOnMessage,
  getStatus as wsGetStatus,
} from '../../services/signedu/signEduWebSocket';

// [추가] sleep 유틸리티
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const StudyDataPage = () => {
  const { wordId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [word, setWord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // [유지] 모달 제어용 상태
  const [isRecordingCompleted, setIsRecordingCompleted] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  // [교체] useSignEduWebcam -> useWebcam 훅으로 원복
  const {
    isWebcamOn,
    error: webcamError,
    startWebcam,
    stopWebcam,
    videoRef: webcamRef // 이름 호환
  } = useWebcam();

  // [추가] SignDetailPage.jsx의 웹소켓/녹화 상태
  const [wsStatus, setWsStatus] = useState(wsGetStatus());
  const [serverFeedback, setServerFeedback] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [countdownText, setCountdownText] = useState("");

  // [추가] SignDetailPage.jsx의 캡처용 Ref
  const canvasRef = useRef(null);
  const recordingRef = useRef(null); // requestAnimationFrame ID
  const isRecordingRef = useRef(false);
  const lastSentRef = useRef(0);
  const debugFrameCountRef = useRef(0);

  // (단어 정보 로딩 useEffect는 원본과 동일)
  useEffect(() => {
    const loadWordData = async () => {
      setIsLoading(true);
      try {
        const wordData = await getSignDetail(wordId);
        setWord(wordData);
      } catch (error) {
        console.error("단어 정보 로딩 실패:", error);
        setWord(null);
      } finally {
        setIsLoading(false);
      }
    };
    if (wordId) loadWordData();
  }, [wordId]);

  // [추가] WebSocket 상태 및 메시지 리스너 (SignDetailPage.jsx 로직)
  useEffect(() => {
    const offStatus = wsOnStatus((s) => setWsStatus(s));

    const offMsg = wsOnMessage((m) => {
      if (m && m.type === 'meta_ack') {
        setServerFeedback('✅ 서버와 연결되었습니다.');
      } else if (m && m.type === 'learning_ack') {
        if (m.status === 'accepted') {
          setServerFeedback('✅ 학습 데이터가 성공적으로 저장되었습니다.');
          setIsRecordingCompleted(true);
          setShowSubmissionModal(true);
        } else {
          setServerFeedback(`❌ 저장 실패: ${m.reason || '알 수 없는 오류'}`);
        }
        setIsBusy(false);
        setCountdownText("");
      }
    });

    return () => {
      offStatus();
      offMsg();
    };
  }, []);

  // [추가] WebSocket 연결 생명주기 (SignDetailPage.jsx 로직)
  // [수정] isWebcamOn (useWebcam 훅의 상태)에 의존
  useEffect(() => {
    if (word && isWebcamOn) {
      wsConnect();
      const offStatusLocal = wsOnStatus((status) => {
        setWsStatus(status);
        if (status === 'Connected') {
          try {
            wsSendMeta({ word_pk: wordId, word_name: word.word });
          } catch (e) {
            console.error('sendMeta 호출 오류:', e);
            setServerFeedback(`sendMeta error: ${e.message}`);
          }
        }
      });
      return () => {
        offStatusLocal();
        wsDisconnect();
      };
    } else if (!isWebcamOn) {
      wsDisconnect();
      setWsStatus(wsGetStatus());
    }
  }, [word, wordId, isWebcamOn]); // [수정] isWebcamOn 의존

  // [수정] handlePrevious: (UI 로직 유지)
  const handlePrevious = () => {
    if (currentStep === 2) {
      setCountdownText("");
      setIsRecordingCompleted(false);
      setShowSubmissionModal(false);
      setIsBusy(false);
      setServerFeedback('');

      stopWebcam(); // [수정] useWebcam의 stopWebcam 호출
      setCurrentStep(1);
    } else {
      navigate('/main');
    }
  };

  // [유지] handleNext: (UI 로직 유지)
  const handleNext = async () => {
    if (currentStep === 1) {
      setCurrentStep(2);
      await startWebcam(); // [수정] useWebcam의 startWebcam 호출
    }
  };

  // [추가] 프레임 캡처 및 전송 로직 (SignDetailPage.jsx 동일)
  const FPS = 30;
  const INTERVAL = 1000 / FPS;

  const captureAndSendFrame = useCallback((timestamp) => {
    if (!isRecordingRef.current) return;
    recordingRef.current = requestAnimationFrame(captureAndSendFrame);
    if (!canvasRef.current || !webcamRef.current) return;

    const now = typeof timestamp === 'number' ? timestamp : performance.now();
    if (now - (lastSentRef.current || 0) < INTERVAL) {
      return;
    }
    lastSentRef.current = now;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    try {
      // [수정] webcamRef는 useWebcam 훅에서 온 것
      const vw = webcamRef.current.videoWidth || 640;
      const vh = webcamRef.current.videoHeight || 480;
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }
      ctx.drawImage(webcamRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          try {
            debugFrameCountRef.current += 1;
            wsSendFrame(blob);
          } catch (e) { console.error('wsSendFrame failed:', e); }
        }
      }, 'image/jpeg', 0.95);
    } catch (e) { console.error('captureAndSendFrame error:', e); }
  }, [webcamRef, INTERVAL]); // [수정] useWebcam의 webcamRef 의존

  // [추가] '녹화 시작하기' 버튼 핸들러 (SignDetailPage.jsx 로직)
  const handleStartRecordingClick = async () => {
    if (wsStatus !== 'Connected' || isBusy) return;

    setIsBusy(true);
    setServerFeedback('준비...');
    setIsRecordingCompleted(false);

    // 1. 3초 카운트다운
    setCountdownText("3"); await sleep(1000);
    setCountdownText("2"); await sleep(1000);
    setCountdownText("1"); await sleep(1000);

    // 2. 5초 녹화(스트리밍) 시작
    setCountdownText("START");
    setServerFeedback("녹화 중... (5초)");

    lastSentRef.current = 0;
    debugFrameCountRef.current = 0;
    isRecordingRef.current = true;
    recordingRef.current = requestAnimationFrame(captureAndSendFrame);

    await sleep(5000); // 5초 대기

    // 3. 5초 후 중지
    isRecordingRef.current = false;
    if (recordingRef.current) {
      cancelAnimationFrame(recordingRef.current);
      recordingRef.current = null;
    }
    lastSentRef.current = 0;
    setCountdownText("녹화 완료");

    // 4. 'save_learning' 전송
    setServerFeedback('녹화 완료. 저장 요청 중...');
    wsSendSaveLearning();
  };

  // [수정] handleRetake: (UI 로직 유지)
  const handleRetake = async () => {
    setShowSubmissionModal(false);
    setCountdownText("");
    setIsRecordingCompleted(false);
    setServerFeedback('');
    setIsBusy(false);
  };

  // [유지] handleSubmit
  const handleSubmit = () => {
    setShowSubmissionModal(false);
    navigate('/main');
  };

  // [추가] 언마운트 시 프레임 캡처 정리
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        cancelAnimationFrame(recordingRef.current);
      }
      isRecordingRef.current = false;
    }
  }, []);

  // ▼▼▼▼▼ [추가] 오류 수정을 위한 로딩/가드 코드 ▼▼▼▼▼
  // (로딩 및 !word 가드 코드는 원본과 동일)
  if (isLoading) {
    return (
        <div className={styles.studyDataPage}>
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner}></div>
            <p>단어 정보를 불러오는 중...</p>
          </div>
        </div>
    );
  }

  if (!word) {
    return (
        <div className={styles.studyDataPage}>
          <div className={styles.errorState}>
            <h2>단어를 찾을 수 없습니다</h2>
            <button onClick={() => navigate('/main')}>메인으로 돌아가기</button>
          </div>
        </div>
    );
  }
  // ▲▲▲▲▲ [추가] 오류 수정을 위한 로딩/가드 코드 ▲▲▲▲▲


  // [수정] JSX 렌더링 (UI 구조 유지, MediaPipe 제거)
  return (
      <div className={styles.studyDataPage}>
        {/* (페이지 제목, 툴팁 - UI 유지) */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>수어 연습 영상 데이터 제공</h1>
        </div>
        <div className={styles.infoTooltip}>
          제출된 영상은 더 나은 서비스를 위해 수어 AI 모델 학습에 이용됩니다.
        </div>

        {/* (단어 정보 - UI 유지) */}
        <div className={styles.wordInfoSection}>
          <div className={styles.wordTitle}>{word.wordName || '단어'}</div>
          <div className={styles.wordDescription}>{word.description || '설명 없음'}</div>
        </div>

        {currentStep === 1 ? (
            // 1단계: 참고 영상 (UI 유지)
            <div className={styles.stepOneContent}>
              <VideoPlayer
                  videoUrl={word.videoUrl}
                  title={word.wordName}
                  width={400}
                  height={300}
                  onEnded={(e) => e.currentTarget.play()}
              />
            </div>
        ) : (
            // 2단계: 웹캠 녹화 (UI 유지)
            <div className={styles.stepTwoContent}>
              <div className={styles.contentContainer}>
                <div className={styles.webcamSection}>
                  <div className={styles.mainVideoCard}>
                    <div className={styles.mainWebcam}>
                      {isWebcamOn ? (
                          <>
                            <video
                                ref={webcamRef}
                                className={styles.webcamVideo}
                                autoPlay
                                playsInline
                                muted
                                data-word-id={wordId}
                            />

                          </>
                      ) : (
                          <div className={styles.webcamPlaceholder}>
                            <span>웹캠을 연결하는 중...</span>
                          </div>
                      )}
                      {/* [수정] countdownText로 조건 변경 */}
                      {countdownText === 'START' && (
                          <div className={styles.recordingIndicator}>
                            <div className={styles.recordingDot}></div>
                            <span>녹화 중</span>
                          </div>
                      )}
                    </div>
                    <div className={styles.playerInfo}>
                      <span className={styles.playerName}>나</span>
                    </div>
                  </div>
                </div>

                {/* 오른쪽: 안내 및 상태 영역 (UI 유지) */}
                <div className={styles.guideSection}>
                  <div className={styles.questionSection}>
                    <h2 className={styles.questionText}>
                      '{word.wordName || '단어'}'를<br/>수어로 표현해 보세요
                    </h2>
                  </div>

                  {/* [수정] 상태별 안내 (새 상태변수 기준으로 로직 교체) */}
                  <div className={styles.statusSection}>
                    {webcamError ? (
                        <div className={styles.errorDisplay}>
                          <div className={styles.errorIcon}>⚠️</div>
                          {/* [수정] useWebcam의 에러 메시지 사용 */}
                          <p className={styles.errorText}>{webcamError || '웹캠 권한을 허용해주세요'}</p>
                        </div>
                    ) : isRecordingCompleted ? (
                        <div className={styles.completedDisplay}>
                          <div className={styles.completedIcon}>✅</div>
                          <p className={styles.completedText}>녹화가 완료되었습니다</p>
                          {serverFeedback && <p className={styles.readyText} style={{fontSize: '0.9rem', marginTop: '5px'}}>{serverFeedback}</p>}
                        </div>
                    ) : countdownText ? (
                        <div className={styles.countdownDisplay}>
                          <div className={styles.countdownNumber}>{countdownText}</div>
                          {/* ▼▼▼▼▼ 오타 수정 ▼▼▼▼▼ */}
                          <p className={styles.countdownText}>
                            {countdownText === "START" ? "녹화가 시작되었습니다!" : (countdownText === "녹화 완료" ? "서버에 전송 중..." : "초 뒤 영상을 촬영합니다")}
                          </p>
                          {/* ▲▲▲▲▲ 오타 수정 ▲▲▲▲▲ */}
                        </div>
                    ) : !isWebcamOn ? (
                        <div className={styles.waitingDisplay}>
                          <div className={styles.waitingIcon}>🤟</div>
                          <p className={styles.waitingText}>웹캠 권한 허용을 기다리는 중...</p>
                        </div>
                    ) : (
                        // [수정] 준비 완료 상태 (UI 유지)
                        <div className={styles.readyDisplay}>
                          <div className={styles.readyIcon}>✅</div>
                          <p className={styles.readyText}>웹캠 연결 완료!</p>

                          {/*/!* ▼▼▼▼▼ 오타 수정 ▼▼▼▼▼ *!/*/}
                          {/*<p className={styles.readyText} style={{fontSize: '0.9rem', color: '#555', marginTop: '5px'}}>*/}
                          {/*  서버 상태: <strong>{wsStatus}</strong>*/}
                          {/*</p>*/}
                          {/*/!* ▲▲▲▲▲ 오타 수정 ▲▲▲▲▲ *!/*/}

                          {/*{serverFeedback && <p className={styles.readyText} style={{fontSize: '0.9rem', color: 'blue', marginTop: '5px'}}>{serverFeedback}</p>}*/}

                          <button
                              className={styles.recordButton}
                              style={{ marginTop: '20px', width: '100%' }}
                              onClick={handleStartRecordingClick}
                              disabled={isBusy || wsStatus !== 'Connected' || !isWebcamOn}
                          >
                            녹화 시작하기
                          </button>
                        </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* (네비게이션 버튼 UI 유지) */}
        <div className={styles.navigationButtons}>
          <button
              className={styles.previousButton}
              onClick={handlePrevious}
          >
            &lt; Previous
          </button>
          {currentStep === 1 && (
              <button
                  className={styles.nextButton}
                  onClick={handleNext}
              >
                Next &gt;
              </button>
          )}
        </div>

        {/* [추가] 프레임 캡처용 숨겨진 캔버스 */}
        <canvas ref={canvasRef} style={{ display: 'none' }} width={640} height={480} />

        {/* (모달 UI 유지) */}
        <DataSubmissionModal
            isOpen={showSubmissionModal}
            onClose={() => setShowSubmissionModal(false)}
            onRetake={handleRetake}
            onSubmit={handleSubmit}
        />
      </div>
  );
};

export default StudyDataPage;