/**
 * @개요 수어 연습 영상 데이터 제공 페이지 (useWebcam + WS 전송)
 * @작성자 신동준 (sdj3959)
 * @최종수정 백승현
 * @최종수정일 2025-10-26
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../../components/ui/VideoPlayer';
import DataSubmissionModal from '../../components/study/DataSubmissionModal';
import styles from './StudyDataPage.module.scss';
import { getSignDetail } from '../../services/signEdu/signEdu.js';

import useWebcam from '../../hooks/useWebcam';
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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const StudyDataPage = () => {
  const { wordId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [word, setWord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isRecordingCompleted, setIsRecordingCompleted] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);

  const {
    isWebcamOn,
    error: webcamError,
    startWebcam,
    stopWebcam,
    videoRef: webcamRef
  } = useWebcam();

  const [wsStatus, setWsStatus] = useState(wsGetStatus());
  // [제거] const [serverFeedback, setServerFeedback] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [countdownText, setCountdownText] = useState("");

  const canvasRef = useRef(null);
  const recordingRef = useRef(null);
  const isRecordingRef = useRef(false);
  const lastSentRef = useRef(0);
  const debugFrameCountRef = useRef(0);

  // (단어 정보 로딩 useEffect)
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

  // [수정] WebSocket 상태 및 메시지 리스너 (서버 피드백 제거)
  useEffect(() => {
    const offStatus = wsOnStatus((s) => setWsStatus(s));

    const offMsg = wsOnMessage((m) => {
      // [제거] if (m && m.type === 'meta_ack') { ... }
      if (m && m.type === 'learning_ack') {
        if (m.status === 'accepted') {
          // [제거] setServerFeedback('✅ 데이터 제공 완료! 재촬영이 가능합니다.');
          setShowSubmissionModal(false);
          setIsRecordingCompleted(true);
        } else {
          // [제거] setServerFeedback(`❌ 제공 실패: ${m.reason || '알 수 없는 오류'}`);
          setShowSubmissionModal(false);
          setIsRecordingCompleted(true);
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

  // [수정] WebSocket 연결 생명주기 (서버 피드백 제거)
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
            // [제거] setServerFeedback(`sendMeta error: ${e.message}`);
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
  }, [word, wordId, isWebcamOn]);

  // [수정] handlePrevious (서버 피드백 제거)
  const handlePrevious = () => {
    if (currentStep === 2) {
      setCountdownText("");
      setIsRecordingCompleted(false);
      setShowSubmissionModal(false);
      setIsBusy(false);
      // [제거] setServerFeedback('');
      stopWebcam();
      setCurrentStep(1);
    } else {
      navigate('/main');
    }
  };

  // [유지] handleNext
  const handleNext = async () => {
    if (currentStep === 1) {
      setCurrentStep(2);
      await startWebcam();
    }
  };

  // [유지] 프레임 캡처 로직
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
  }, [webcamRef, INTERVAL]);

  // [수정] '녹화/재촬영' 버튼 핸들러 (서버 피드백 제거)
  const handleStartRecordingClick = async () => {
    if (wsStatus !== 'Connected' || isBusy) return;

    try {
      wsSendMeta({ word_pk: wordId, word_name: word.word });
    } catch (e) {
      console.error('sendMeta (for retake) 호출 오류:', e);
      // [제거] setServerFeedback(`sendMeta error: ${e.message}`);
      return;
    }

    setIsBusy(true);
    // [제거] setServerFeedback('준비...');
    setIsRecordingCompleted(false);

    setCountdownText("3"); await sleep(1000);
    setCountdownText("2"); await sleep(1000);
    setCountdownText("1"); await sleep(1000);

    setCountdownText("START");
    // [제거] setServerFeedback("녹화 중... (5초)");

    lastSentRef.current = 0;
    debugFrameCountRef.current = 0;
    isRecordingRef.current = true;
    recordingRef.current = requestAnimationFrame(captureAndSendFrame);

    await sleep(5000);

    isRecordingRef.current = false;
    if (recordingRef.current) {
      cancelAnimationFrame(recordingRef.current);
      recordingRef.current = null;
    }
    lastSentRef.current = 0;

    setCountdownText("");
    // [제거] setServerFeedback("녹화 완료. 모달을 확인하세요.");

    setIsBusy(false);
    setIsRecordingCompleted(true);
    setShowSubmissionModal(true);
  };

  // [수정] handleRetake: 'X' 버튼(onClose)을 위한 함수 (서버 피드백 제거)
  const handleRetake = async () => {
    setShowSubmissionModal(false);
    setIsRecordingCompleted(true);
    setCountdownText("");
    // [제거] setServerFeedback('재촬영이 가능합니다.');
    setIsBusy(false);
  };

  // [유지] handleSubmit: '메인으로' 버튼(onSubmit)을 위한 함수
  const handleSubmit = () => {
    setShowSubmissionModal(false);
    stopWebcam();
    navigate('/main');
  };

  // [수정] handleProvideData: '데이터 제공' 버튼(onRetake)을 위한 함수 (서버 피드백 제거)
  const handleProvideData = () => {
    // [제거] setServerFeedback('데이터 제공 요청 중...');
    wsSendSaveLearning();
  };

  // [유지] 언마운트 시 프레임 캡처 정리
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        cancelAnimationFrame(recordingRef.current);
      }
      isRecordingRef.current = false;
    }
  }, []);

  // [유지] 로딩 및 가드 코드
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

  // [수정] JSX 렌더링 (서버 피드백 제거)
  return (
      <div className={styles.studyDataPage}>
        {/* (페이지 제목, 툴팁 - UI 유지) */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>수어 연습 영상 데이터 제공</h1>
        </div>
        <div className={styles.infoTooltip}>
          제출된 영상은 더 나은 서비스를 위해 수어 AI 모델 학습에 이용됩니다.
        </div>

        {/* (단어 정보 - UI 유지, word.word로 수정) */}
        <div className={styles.wordInfoSection}>
          <div className={styles.wordTitle}>{word.word || '단어'}</div>
          <div className={styles.wordDescription}>{word.description || '설명 없음'}</div>
        </div>

        {currentStep === 1 ? (
            // 1단계: 참고 영상 (UI 유지)
            <div className={styles.stepOneContent}>
              <VideoPlayer
                  videoUrl={word.videoUrl}
                  title={word.word}
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
                  {/* (웹캠 비디오 부분 UI 유지) */}
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
                      '{word.word || '단어'}'를<br/>수어로 표현해 보세요
                    </h2>
                  </div>

                  {/* ▼▼▼▼▼ [수정] 상태별 안내 (서버 피드백 제거) ▼▼▼▼▼ */}
                  <div className={styles.statusSection}>
                    {webcamError ? (
                        <div className={styles.errorDisplay}>
                          <div className={styles.errorIcon}>⚠️</div>
                          <p className={styles.errorText}>{webcamError || '웹캠 권한을 허용해주세요'}</p>
                        </div>

                    ) : countdownText ? (
                        <div className={styles.countdownDisplay}>
                          <div className={styles.countdownNumber}>{countdownText}</div>
                          <p className={styles.countdownText}>
                            {countdownText === "START" ? "녹화가 시작되었습니다!" : "초 뒤 영상을 촬영합니다"}
                          </p>
                        </div>

                    ) : isRecordingCompleted ? (
                        <div className={styles.completedDisplay}>
                          <div className={styles.completedIcon}>✅</div>
                          <p className={styles.completedText}>녹화가 완료되었습니다</p>
                          {/* [제거] {serverFeedback && <p>...</p>} */}

                          <button
                              className={styles.recordButton}
                              style={{ marginTop: '20px', width: '100%', backgroundColor: '#f0ad4e' }}
                              onClick={handleStartRecordingClick}
                              disabled={isBusy || wsStatus !== 'Connected' || !isWebcamOn}
                          >
                            재촬영하기
                          </button>
                        </div>

                    ) : !isWebcamOn ? (
                        <div className={styles.waitingDisplay}>
                          <div className={styles.waitingIcon}>🤟</div>
                          <p className={styles.waitingText}>웹캠 권한 허용을 기다리는 중...</p>
                        </div>

                    ) : (
                        <div className={styles.readyDisplay}>
                          <div className={styles.readyIcon}>✅</div>
                          <p className={styles.readyText}>웹캠 연결 완료!</p>

                          {/* [제거] 서버 상태 및 피드백 */}

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
                  {/* ▲▲▲▲▲ [수정] 상태별 안내 완료 ▲▲▲▲▲ */}
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

        {/* [유지] 프레임 캡처용 숨겨진 캔버스 */}
        <canvas ref={canvasRef} style={{ display: 'none' }} width={640} height={480} />

        {/* [유지] 모달 핸들러 매핑 */}
        <DataSubmissionModal
            isOpen={showSubmissionModal}
            onClose={handleRetake}       // 'X' 버튼 클릭 시 -> 재촬영
            onRetake={handleProvideData} // '데이터 제공' 버튼 클릭 시 -> wsSendSaveLearning
            onSubmit={handleSubmit}     // '메인으로' 버튼 클릭 시 -> 메인으로 이동
        />
      </div>
  );
};

export default StudyDataPage;