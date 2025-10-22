/**
 * @개요 수어 연습 영상 데이터 제공 페이지 컴포넌트입니다.
 * @작성자 신동준 (sdj3959)
 * @작성일 2025-01-21
 * @최종수정일 2025-01-21
 * @반환값 {JSX.Element} 수어 연습 영상 데이터 제공 페이지 컴포넌트를 반환합니다.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../../components/ui/VideoPlayer';
import DataSubmissionModal from '../../components/study/DataSubmissionModal';
import useWebcam from '../../hooks/useWebcam';
import styles from './StudyDataPage.module.scss';

const StudyDataPage = () => {
  const { wordId } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1); // 1: 안내 단계, 2: 녹화 단계
  const [word, setWord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(null); // 카운트다운 상태
  const [recordingCountdown, setRecordingCountdown] = useState(null); // 녹화 중 카운트다운
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingCompleted, setIsRecordingCompleted] = useState(false); // 녹화 완료 상태
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

  // MediaPipe 관련 상태 (추후 연동 시 사용)
  const [mediapipeReady, setMediapipeReady] = useState(false);
  const [handLandmarks, setHandLandmarks] = useState(null);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const mediapipeCanvasRef = useRef(null);

  // 단어 정보 로딩 (더미 데이터)
  useEffect(() => {
    const loadWordData = async () => {
      setIsLoading(true);
      
      // API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 더미 데이터 생성
      const dummyWord = {
        id: wordId,
        word: `단어${wordId}`,
        description: `단어${wordId}에 대한 수어 설명입니다. 양손을 사용하여 표현하며, 자연스러운 동작으로 의미를 전달합니다.`,
        videoUrl: '', // TODO: 실제 영상 URL 연동 필요
        category: '일상'
      };
      
      setWord(dummyWord);
      setIsLoading(false);
    };

    if (wordId) {
      loadWordData();
    }
  }, [wordId]);

  const handlePrevious = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      // 메인 페이지로 돌아가기
      navigate('/main');
    }
  };

  const handleNext = async () => {
    if (currentStep === 1) {
      setCurrentStep(2);
      // 2단계로 넘어갈 때 웹캠 자동 시작
      await startWebcam();
    }
  };

  // 웹캠이 연결되면 자동으로 카운트다운 시작
  useEffect(() => {
    if (currentStep === 2 && isWebcamOn && countdown === null && !isRecording && !isRecordingCompleted) {
      // 웹캠이 연결된 후 1초 뒤 카운트다운 시작
      setTimeout(() => {
        startCountdown();
      }, 1000);
    }
  }, [currentStep, isWebcamOn, countdown, isRecording, isRecordingCompleted]);

  // 카운트다운 시작
  const startCountdown = () => {
    setCountdown(5);
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

  // 녹화 시작
  const startRecording = () => {
    setIsRecording(true);
    setCountdown(null);
    setRecordingCountdown(6);
    
    // 녹화 중 카운트다운 시작
    recordingCountdownRef.current = setInterval(() => {
      setRecordingCountdown(prev => {
        if (prev <= 1) {
          clearInterval(recordingCountdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // 6초 후 녹화 종료
    recordingRef.current = setTimeout(() => {
      stopRecording();
    }, 6000);
  };

  // 녹화 종료
  const stopRecording = () => {
    setIsRecording(false);
    setRecordingCountdown(0); // 0초로 고정
    setIsRecordingCompleted(true); // 녹화 완료 상태로 설정
    clearTimeout(recordingRef.current);
    clearInterval(recordingCountdownRef.current);
    setShowSubmissionModal(true);
  };

  // 재촬영
  const handleRetake = async () => {
    // 모든 타이머 정리
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    if (recordingRef.current) {
      clearTimeout(recordingRef.current);
      recordingRef.current = null;
    }
    if (recordingCountdownRef.current) {
      clearInterval(recordingCountdownRef.current);
      recordingCountdownRef.current = null;
    }

    // 상태 초기화
    setShowSubmissionModal(false);
    setCountdown(null);
    setRecordingCountdown(null);
    setIsRecording(false);
    setIsRecordingCompleted(false);
    
    // 웹캠 재시작 (권한 재확인)
    stopWebcam();
    await new Promise(resolve => setTimeout(resolve, 500)); // 웹캠 정리 대기
    await startWebcam();
  };

  // 제출 (메인으로 이동)
  const handleSubmit = () => {
    setShowSubmissionModal(false);
    navigate('/main');
  };

  // MediaPipe 초기화 및 수어 인식 함수들 (추후 연동 시 사용)
  
  /**
   * MediaPipe 초기화 함수
   * TODO: MediaPipe Hands 모델 로드 및 초기화
   */
  const initializeMediaPipe = async () => {
    try {
      // TODO: MediaPipe Hands 모델 초기화
      // const hands = new Hands({
      //   locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      // });
      
      // TODO: 모델 설정
      // hands.setOptions({
      //   maxNumHands: 2,
      //   modelComplexity: 1,
      //   minDetectionConfidence: 0.5,
      //   minTrackingConfidence: 0.5
      // });
      
      // TODO: 결과 처리 콜백 설정
      // hands.onResults(onMediaPipeResults);
      
      setMediapipeReady(true);
      console.log('MediaPipe 초기화 완료');
    } catch (error) {
      console.error('MediaPipe 초기화 실패:', error);
    }
  };

  /**
   * MediaPipe 결과 처리 함수
   * TODO: 손 랜드마크 데이터 처리 및 수어 인식
   */
  const onMediaPipeResults = (results) => {
    // TODO: 손 랜드마크 데이터 저장
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      setHandLandmarks(results.multiHandLandmarks);
      
      // TODO: 캔버스에 랜드마크 그리기
      drawHandLandmarks(results);
      
      // TODO: 수어 인식 API 호출
      if (isRecording) {
        recognizeSignLanguage(results.multiHandLandmarks);
      }
    }
  };

  /**
   * 손 랜드마크 시각화 함수
   * TODO: 캔버스에 손 랜드마크 그리기
   */
  const drawHandLandmarks = (results) => {
    const canvas = mediapipeCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // TODO: 랜드마크 점과 연결선 그리기
    // if (results.multiHandLandmarks) {
    //   for (const landmarks of results.multiHandLandmarks) {
    //     drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 2});
    //     drawLandmarks(ctx, landmarks, {color: '#FF0000', lineWidth: 1});
    //   }
    // }
  };

  /**
   * 수어 인식 함수
   * TODO: 손 랜드마크 데이터를 서버로 전송하여 수어 인식
   */
  const recognizeSignLanguage = async (landmarks) => {
    try {
      // TODO: 서버 API 호출
      // const response = await fetch('/api/study/analyze', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     wordId: word.id,
      //     landmarks: landmarks,
      //     timestamp: Date.now()
      //   })
      // });
      
      // TODO: 인식 결과 처리
      // const result = await response.json();
      // setRecognitionResult(result);
      
      console.log('수어 인식 처리 중...', landmarks.length, '개의 손 감지됨');
    } catch (error) {
      console.error('수어 인식 실패:', error);
    }
  };

  // MediaPipe 초기화 (웹캠 연결 후)
  useEffect(() => {
    if (isWebcamOn && !mediapipeReady) {
      initializeMediaPipe();
    }
  }, [isWebcamOn, mediapipeReady]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (recordingRef.current) {
        clearTimeout(recordingRef.current);
      }
      if (recordingCountdownRef.current) {
        clearInterval(recordingCountdownRef.current);
      }
    };
  }, []);

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
      {/* 페이지 제목 */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>수어 연습 영상 데이터 제공</h1>
      </div>

      {/* 데이터 제공 안내 툴팁 */}
      <div className={styles.infoTooltip}>
        제출된 영상은 더 나은 서비스를 위해 수어 AI 모델 학습에 이용됩니다.
      </div>

      {/* 단어 정보 및 설명 */}
      <div className={styles.wordInfoSection}>
        <div className={styles.wordTitle}>{word.word}</div>
        <div className={styles.wordDescription}>{word.description}</div>
      </div>

      {currentStep === 1 ? (
        // 1단계: 참고 영상
        <div className={styles.stepOneContent}>
          <VideoPlayer
            videoUrl={word.videoUrl}
            title={word.word}
            width={400}
            height={300}
          />
        </div>
      ) : (
        // 2단계: 웹캠 및 녹화 (실시간 퀴즈 스타일)
        <div className={styles.stepTwoContent}>
          <div className={styles.contentContainer}>
            {/* 왼쪽: 웹캠 영역 - MediaPipe 수어 인식 연동 영역 */}
            <div className={styles.webcamSection}>
              <div className={styles.mainVideoCard}>
                <div className={styles.mainWebcam}>
                  {isWebcamOn ? (
                    <>
                      {/* 메인 웹캠 비디오 */}
                      <video
                        ref={webcamRef}
                        className={styles.webcamVideo}
                        autoPlay
                        playsInline
                        muted
                        // MediaPipe 연동 시 사용할 속성들
                        data-mediapipe-target="true"
                        data-word-id={word.id}
                      />
                      
                      {/* MediaPipe 캔버스 오버레이 (손 랜드마크 표시용) */}
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
                      
                      {/* TODO: MediaPipe 연동 시 추가할 요소들
                          - 손 랜드마크 시각화
                          - 수어 인식 결과 표시
                          - 유사도 점수 오버레이
                      */}
                    </>
                  ) : (
                    <div className={styles.webcamPlaceholder}>
                      <span>웹캠을 연결하는 중...</span>
                    </div>
                  )}
                  
                  {/* 녹화 상태 표시 */}
                  {isRecording && (
                    <div className={styles.recordingIndicator}>
                      <div className={styles.recordingDot}></div>
                      <span>녹화 중</span>
                    </div>
                  )}
                </div>
                
                <div className={styles.playerInfo}>
                  <span className={styles.playerName}>나</span>
                  {/* TODO: MediaPipe 연동 시 추가할 정보
                      - 실시간 유사도 점수
                      - 인식된 수어 단어
                      - 피드백 메시지
                  */}
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

              {/* 상태별 안내 메시지 */}
              <div className={styles.statusSection}>
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
                  <div className={styles.readyDisplay}>
                    <div className={styles.readyIcon}>✅</div>
                    <p className={styles.readyText}>웹캠 연결 완료!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 네비게이션 버튼 */}
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

      {/* 데이터 제출 모달 */}
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