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
  const [isRecording, setIsRecording] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const countdownRef = useRef(null);
  const recordingRef = useRef(null);

  const {
    isWebcamOn,
    error: webcamError,
    startWebcam,
    stopWebcam,
    videoRef: webcamRef
  } = useWebcam();

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
      // 5초 후 녹화 시작 카운트다운
      setTimeout(() => {
        startCountdown();
      }, 1000);
    }
  };

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
    
    // 6초 후 녹화 종료
    recordingRef.current = setTimeout(() => {
      stopRecording();
    }, 6000);
  };

  // 녹화 종료
  const stopRecording = () => {
    setIsRecording(false);
    clearTimeout(recordingRef.current);
    setShowSubmissionModal(true);
  };

  // 재촬영
  const handleRetake = () => {
    setShowSubmissionModal(false);
    setCountdown(null);
    setIsRecording(false);
    // 1초 후 다시 카운트다운 시작
    setTimeout(() => {
      startCountdown();
    }, 1000);
  };

  // 제출 (메인으로 이동)
  const handleSubmit = () => {
    setShowSubmissionModal(false);
    navigate('/main');
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      if (recordingRef.current) {
        clearTimeout(recordingRef.current);
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
            {/* 왼쪽: 웹캠 영역 */}
            <div className={styles.webcamSection}>
              <div className={styles.mainVideoCard}>
                <div className={styles.mainWebcam}>
                  {isWebcamOn ? (
                    <video
                      ref={webcamRef}
                      className={styles.webcamVideo}
                      autoPlay
                      playsInline
                      muted
                    />
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
                {countdown !== null ? (
                  <div className={styles.countdownDisplay}>
                    <div className={styles.countdownNumber}>{countdown}</div>
                    <p className={styles.countdownText}>초 뒤 영상을 촬영합니다</p>
                  </div>
                ) : isRecording ? (
                  <div className={styles.recordingDisplay}>
                    <div className={styles.recordingIcon}>🎥</div>
                    <p className={styles.recordingText}>6초 뒤 녹화가 종료됩니다</p>
                  </div>
                ) : (
                  <div className={styles.waitingDisplay}>
                    <div className={styles.waitingIcon}>🤟</div>
                    <p className={styles.waitingText}>웹캠 연결을 기다리는 중...</p>
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