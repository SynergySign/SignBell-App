/**
 * @개요 수어 연습 영상 데이터 제공 페이지 컴포넌트입니다.
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-01-21
 * @최종수정일 2025-01-21 (3회 재생 제거, 수동 녹화 시작 버튼 추가)
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../../components/ui/VideoPlayer';
import DataSubmissionModal from '../../components/study/DataSubmissionModal';
import useWebcam from '../../hooks/useWebcam';
import styles from './StudyDataPage.module.scss';
import { getSignDetail } from '../../services/signEdu/signEdu.js';

const StudyDataPage = () => {
  const { wordId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [word, setWord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // [삭제] 3회 재생 관련 상태 제거
  // const [showOriginalVideo, setShowOriginalVideo] = useState(false);
  // const [playbackCount, setPlaybackCount] = useState(0);
  // const videoPlaybackRef = useRef(null);

  const [countdown, setCountdown] = useState(null);
  const [recordingCountdown, setRecordingCountdown] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingCompleted, setIsRecordingCompleted] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const countdownRef = useRef(null);
  const recordingRef = useRef(null);
  const recordingCountdownRef = useRef(null);

  const {
    isWebcamOn,
    error: webcamError,
    startWebcam,
    stopWebcam,
    videoRef: webcamRef
  } = useWebcam();

  const [mediapipeReady, setMediapipeReady] = useState(false);
  const mediapipeCanvasRef = useRef(null);

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

  // [수정] handlePrevious: 3회 재생 관련 로직 제거
  const handlePrevious = () => {
    if (currentStep === 2) {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (recordingRef.current) clearTimeout(recordingRef.current);
      if (recordingCountdownRef.current) clearInterval(recordingCountdownRef.current);

      setCountdown(null);
      setRecordingCountdown(null);
      setIsRecording(false);
      setIsRecordingCompleted(false);
      setShowSubmissionModal(false);

      stopWebcam();
      setCurrentStep(1);
    } else {
      navigate('/main');
    }
  };

  // [수정] handleNext: 웹캠을 바로 켜도록 원복
  const handleNext = async () => {
    if (currentStep === 1) {
      setCurrentStep(2);
      await startWebcam();
    }
  };


  const startCountdown = () => {
    setCountdown(5); // 5초 카운트다운 (요청하신 3초로 바꾸려면 여기를 3으로)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          startRecording();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startRecording = () => {
    setIsRecording(true);
    setCountdown(null);
    setRecordingCountdown(6);

    recordingCountdownRef.current = setInterval(() => {
      setRecordingCountdown(prev => {
        if (prev <= 1) {
          clearInterval(recordingCountdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    recordingRef.current = setTimeout(() => {
      stopRecording();
    }, 6000);
  };

  const stopRecording = () => {
    setIsRecording(false);
    setRecordingCountdown(0);
    setIsRecordingCompleted(true);
    clearTimeout(recordingRef.current);
    clearInterval(recordingCountdownRef.current);
    setShowSubmissionModal(true);
  };

  const handleRetake = async () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (recordingRef.current) clearTimeout(recordingRef.current);
    if (recordingCountdownRef.current) clearInterval(recordingCountdownRef.current);

    setShowSubmissionModal(false);
    setCountdown(null);
    setRecordingCountdown(null);
    setIsRecording(false);
    setIsRecordingCompleted(false);

    stopWebcam();
    await new Promise(resolve => setTimeout(resolve, 500));
    await startWebcam();
  };

  const handleSubmit = () => {
    setShowSubmissionModal(false);
    navigate('/main');
  };
  useEffect(() => { /* ... MediaPipe 초기화 ... */ }, [isWebcamOn, mediapipeReady]);
  useEffect(() => { /* ... 타이머 정리 ... */ }, []);


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

  return (
      <div className={styles.studyDataPage}>
        {/* (페이지 제목, 툴팁, 단어 정보 렌더링은 원본과 동일) */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>수어 연습 영상 데이터 제공</h1>
        </div>
        <div className={styles.infoTooltip}>
          제출된 영상은 더 나은 서비스를 위해 수어 AI 모델 학습에 이용됩니다.
        </div>
        <div className={styles.wordInfoSection}>
          <div className={styles.wordTitle}>{word.word}</div>
          <div className={styles.wordDescription}>{word.description}</div>
        </div>

        {currentStep === 1 ? (
            // 1단계: 참고 영상 (VideoPlayer 사용, onEnded로 무한반복)
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
            // 2단계: 웹캠 녹화
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
                                data-mediapipe-target="true"
                                data-word-id={word.id}
                            />
                            <canvas
                                ref={mediapipeCanvasRef}
                                className={styles.mediapipeCanvas}
                                width="640"
                                height="480"
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  pointerEvents: 'none',
                                  zIndex: 2
                                }}
                            />
                          </>
                      ) : (
                          <div className={styles.webcamPlaceholder}>
                            <span>웹캠을 연결하는 중...</span>
                          </div>
                      )}
                      {isRecording && (
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

                {/* 오른쪽: 안내 및 상태 영역 */}
                <div className={styles.guideSection}>
                  <div className={styles.questionSection}>
                    <h2 className={styles.questionText}>
                      '{word.word}'를<br/>수어로 표현해 보세요
                    </h2>
                  </div>

                  {/* [수정] 상태별 안내 메시지 */}
                  <div className={styles.statusSection}>
                    {/* [수정] 3회 재생 로직 제거 */}
                    {webcamError ? (
                        <div className={styles.errorDisplay}>
                          <div className={styles.errorIcon}>⚠️</div>
                          <p className={styles.errorText}>웹캠 권한을 허용해주세요</p>
                        </div>
                    ) : isRecordingCompleted ? (
                        <div className={styles.completedDisplay}>
                          <div className={styles.completedIcon}>✅</div>
                          <p className={styles.completedText}>녹화가 완료되었습니다</p>
                        </div>
                    ) : countdown !== null ? (
                        <div className={styles.countdownDisplay}>
                          <div className={styles.countdownNumber}>{countdown}</div>
                          <p className={styles.countdownText}>초 뒤 영상을 촬영합니다</p>
                        </div>
                    ) : isRecording ? (
                        <div className={styles.recordingDisplay}>
                          <div className={styles.recordingIcon}>🎥</div>
                          <p className={styles.recordingText}>{recordingCountdown}초 뒤 녹화가 종료됩니다</p>
                        </div>
                    ) : !isWebcamOn ? (
                        <div className={styles.waitingDisplay}>
                          <div className={styles.waitingIcon}>🤟</div>
                          <p className={styles.waitingText}>웹캠 권한 허용을 기다리는 중...</p>
                        </div>
                    ) : (
                        // [수정] "웹캠 연결 완료" 상태일 때 버튼 표시
                        <div className={styles.readyDisplay}>
                          <div className={styles.readyIcon}>✅</div>
                          <p className={styles.readyText}>웹캠 연결 완료!</p>

                          {/* [추가] 녹화 시작 버튼 */}
                          <button
                              className={styles.recordButton}
                              style={{ marginTop: '20px', width: '100%' }}
                              onClick={startCountdown} // 클릭 시 5초 카운트다운 시작
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

        {/* (네비게이션 버튼 및 모달은 원본과 동일) */}
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