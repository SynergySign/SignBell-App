import { useState, useCallback, useMemo } from 'react';

/**
 * 퀴즈 게임 상태 관리 훅
 */
export const useQuizGame = () => {
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [currentWord, setCurrentWord] = useState('');
  const [timer, setTimer] = useState(10);
  const [isTimerActive, setIsTimerActive] = useState(true);
  const [challengersCount, setChallengersCount] = useState(0);
  const [hasChallenged, setHasChallenged] = useState(false);
  const [challengeOrder, setChallengeOrder] = useState(null);
  const [gamePhase, setGamePhase] = useState('challenge');
  const [solvingTimer, setSolvingTimer] = useState(5);
  const [signingTimer, setSigningTimer] = useState(5);
  const [isWaitingResult, setIsWaitingResult] = useState(false);
  const [resultMessage, setResultMessage] = useState('');
  const [players, setPlayers] = useState([]);
  const [currentChallengerInfo, setCurrentChallengerInfo] = useState({
    id: null,
    nickname: '대기중',
    score: 0
  });

  const [answerResult, setAnswerResult] = useState(null);  // 정답 결과 정보

  const [toast, setToast] = useState({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const showToast = useCallback((message, type = 'info') => {
    setToast({ isOpen: true, message, type });
  }, []);

  const closeToast = useCallback(() => {
    setToast(prev => ({ ...prev, isOpen: false }));
  }, []);

  const resetGameState = useCallback(() => {
    setTimer(10);
    setIsTimerActive(true);
    setChallengersCount(0);
    setHasChallenged(false);
    setChallengeOrder(null);
    setGamePhase('challenge');
    setCurrentChallengerInfo({
      id: null,
      nickname: '대기중',
      score: 0
    });
    setPlayers(prev => prev.map(player => ({
      ...player,
      hasChallenged: false,
      challengeOrder: null,
      isCurrentPlayer: false
    })));
  }, []);

  // useMemo로 반환 객체를 메모이제이션하여 불필요한 재생성 방지
  return useMemo(() => ({
    // State
    currentQuestion,
    totalQuestions,
    currentWord,
    timer,
    isTimerActive,
    challengersCount,
    hasChallenged,
    challengeOrder,
    gamePhase,
    solvingTimer,
    signingTimer,
    isWaitingResult,
    resultMessage,
    players,
    currentChallengerInfo,
    answerResult,
    toast,

    // Setters
    setCurrentQuestion,
    setTotalQuestions,
    setCurrentWord,
    setTimer,
    setIsTimerActive,
    setChallengersCount,
    setHasChallenged,
    setChallengeOrder,
    setGamePhase,
    setSolvingTimer,
    setSigningTimer,
    setIsWaitingResult,
    setResultMessage,
    setPlayers,
    setCurrentChallengerInfo,
    setAnswerResult,

    // Actions
    showToast,
    closeToast,
    resetGameState,
  }), [
    currentQuestion,
    totalQuestions,
    currentWord,
    timer,
    isTimerActive,
    challengersCount,
    hasChallenged,
    challengeOrder,
    gamePhase,
    solvingTimer,
    signingTimer,
    isWaitingResult,
    resultMessage,
    players,
    currentChallengerInfo,
    answerResult,
    toast,
    showToast,
    closeToast,
    resetGameState,
  ]);
};
