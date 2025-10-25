package app.signbell.backend.service;

import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.dto.quiz.*;
import app.signbell.backend.dto.quiz.TimerUpdateResponse;
import app.signbell.backend.entity.*;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * QuizService 클래스
 *
 * 퀴즈 게임의 전반적인 로직을 관리하는 서비스 클래스. 게임방, 참가자, 퀴즈 단어, 게임 기록 등
 * 여러 리소스를 처리하며 게임 시작, 정답 제출, 게임 종료 등을 수행함.
 * 
 * @author 고동현
 * @since 2025-10-17
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuizService {

        private final GameRoomRepository gameRoomRepository;
        private final GameParticipantRepository gameParticipantRepository;
        private final QuizWordRepository quizWordRepository;
        private final GameHistoryRepository gameHistoryRepository;
        private final UserRepository userRepository;
        private final QuizStateCache quizStateCache;
        private final SimpMessagingTemplate messagingTemplate;

        @Transactional
        public GameStartResponse startGame(Long roomId, Long userId) {
                // 1. 방장 권한 확인
                GameParticipant hostParticipant = gameParticipantRepository
                                .findByGameRoom_IdAndParticipant_IdAndIsHost(roomId, userId, true)
                                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_ROOM_HOST));

                GameRoom gameRoom = hostParticipant.getGameRoom();

                // 2. 게임 상태 확인 (이미 시작되지 않았는지)
                validateGameNotStarted(gameRoom);

                // 3. 최소 인원 확인 (2명 이상)
                List<GameParticipant> allParticipants = gameParticipantRepository
                                .findAllByGameRoom_Id(roomId);

                if (allParticipants.size() < 2) {
                        throw new BusinessException(ErrorCode.ROOM_MIN_PARTICIPANTS_NOT_MET);
                }

                // 4. 퀴즈 단어 개수 확인
                long quizWordCount = quizWordRepository.count();
                if (quizWordCount < 8) {
                        throw new BusinessException(ErrorCode.WORD_LIST_EMPTY);
                }

                // 4. 랜덤 퀴즈 단어 8개 선택
                List<QuizWord> allQuizWords = quizWordRepository.findAll();
                Collections.shuffle(allQuizWords);
                List<QuizWord> selectedWords = allQuizWords.stream()
                                .limit(8)
                                .collect(Collectors.toList());

                // 5. 캐시 초기화 및 문제 저장
                QuizStateCache.GameRoomState roomState = quizStateCache.getOrCreateRoomState(roomId);
                for (int i = 0; i < selectedWords.size(); i++) {
                        int questionNumber = i + 1;
                        roomState.setQuizWordId(questionNumber, selectedWords.get(i).getId());
                }

                // 6. 게임 상태 변경
                gameRoom.updateStatus(GameRoomStatus.IN_PROGRESS);

                log.info("게임 시작 - roomId: {}, participants: {}, questions: {}",
                                roomId, allParticipants.size(), selectedWords.size());

                // 7. 참가자 정보 생성
                List<app.signbell.backend.dto.response.ParticipantResponse> participantResponses = allParticipants
                                .stream()
                                .map(gp -> app.signbell.backend.dto.response.ParticipantResponse.builder()
                                                .userId(gp.getParticipant().getId())
                                                .nickname(gp.getParticipant().getNickname())
                                                .profileImageUrl(gp.getParticipant().getProfileImageUrl())
                                                .isHost(gp.isHost())
                                                .isReady(gp.isReady())
                                                .build())
                                .collect(java.util.stream.Collectors.toList());

                // 8. 첫 번째 문제 정보 전송 (단어 제목 + 참가자 정보)
                QuizWord firstQuiz = selectedWords.get(0);
                QuizStartResponse response = QuizStartResponse.builder()
                                .questionNumber(1)
                                .totalQuestions(8)
                                .wordTitle(firstQuiz.getSign().getTitle())
                                .participants(participantResponses)
                                .myUserId(userId) // 요청한 사용자 ID (방장)
                                .build();

                messagingTemplate.convertAndSend(
                                "/topic/room/" + roomId + "/quiz/start",
                                ApiResponse.success("게임이 시작되었습니다", response));

                // 8. 첫 번째 문제 도전 신청 타임아웃 스케줄링 (10초)
                scheduleChallengeTimeout(roomId, 1);

                // 9. 도전 신청 타이머 시작 (10초)
                startChallengeTimer(roomId, 1);

                return GameStartResponse.builder()
                                .totalQuestions(8)
                                .build();
        }

        @Transactional
        public void registerChallenge(Long roomId, Long userId, Integer questionNumber) {
                // 1. 게임 진행 중인지 확인
                validateGameInProgress(roomId);

                // 2. 문제 번호 유효성 검증
                validateQuestionNumber(questionNumber);

                // 3. 참가자 확인
                GameParticipant participant = gameParticipantRepository
                                .findByGameRoom_IdAndParticipant_Id(roomId, userId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.PARTICIPANT_NOT_FOUND));

                QuizStateCache.GameRoomState roomState = quizStateCache.getOrCreateRoomState(roomId);

                // 4. 중복 도전 신청 확인
                Integer existingOrder = roomState.getChallengerOrder(questionNumber, userId);
                if (existingOrder != null) {
                        messagingTemplate.convertAndSendToUser(
                                        String.valueOf(userId),
                                        "/queue/errors",
                                        ApiResponse.error("이미 도전 신청을 하셨습니다"));
                        return;
                }

                // 5. 도전권 등록 (최대 4명)
                boolean registered = roomState.addChallenger(questionNumber, userId);

                if (registered) {
                        Integer order = roomState.getChallengerOrder(questionNumber, userId);
                        log.info("도전권 획득 - userId: {}, roomId: {}, question: {}, order: {}",
                                        userId, roomId, questionNumber, order);

                        // 6. 도전 신청 성공 알림 (개인 메시지)
                        messagingTemplate.convertAndSendToUser(
                                        String.valueOf(userId),
                                        "/queue/challenge",
                                        ApiResponse.success("도전 신청이 완료되었습니다",
                                                        Map.of("order", order, "questionNumber", questionNumber)));

                        // 7. 모든 참가자에게 도전자 수 업데이트 브로드캐스트
                        Integer challengerCount = roomState.getChallengerCount(questionNumber);
                        messagingTemplate.convertAndSend(
                                        "/topic/room/" + roomId + "/quiz",
                                        ApiResponse.success("도전자 등록",
                                                        Map.of("eventType", "CHALLENGER_REGISTERED",
                                                                        "questionNumber", questionNumber,
                                                                        "challengerCount", challengerCount,
                                                                        "maxChallengers", 4)));

                        log.info("도전 신청 완료 - userId: {}, question: {}, 현재 도전자 수: {}",
                                        userId, questionNumber, challengerCount);
                } else {
                        // 8. 도전권 초과
                        messagingTemplate.convertAndSendToUser(
                                        String.valueOf(userId),
                                        "/queue/errors",
                                        ApiResponse.error("도전권이 마감되었습니다"));
                }
        }

        /**
         * 정답 제출 (테스트용 - 신뢰도 점수 없음)
         */
        @Transactional
        public void submitAnswer(Long roomId, Long userId, Integer questionNumber, String answer) {
                // 테스트에서는 신뢰도 점수를 1.0으로 간주 (항상 통과)
                submitAnswer(roomId, userId, questionNumber, answer, 1.0);
        }

        /**
         * 정답 제출 (실제 게임용 - 신뢰도 점수 포함)
         */
        @Transactional
        public void submitAnswer(Long roomId, Long userId, Integer questionNumber, String answer, Double confidenceScore) {
                // 1. 게임 진행 중인지 확인
                validateGameInProgress(roomId);

                // 2. 문제 번호 유효성 검증
                validateQuestionNumber(questionNumber);

                QuizStateCache.GameRoomState roomState = quizStateCache.getOrCreateRoomState(roomId);

                // 3. 도전 차례 확인
                Long currentChallenger = roomState.getCurrentChallenger(questionNumber);
                
                log.info("도전 차례 확인 - roomId: {}, question: {}, currentChallenger: {}, submitUserId: {}", 
                        roomId, questionNumber, currentChallenger, userId);
                
                if (currentChallenger == null) {
                        log.warn("도전 차례 없음 - roomId: {}, question: {}, userId: {}", 
                                roomId, questionNumber, userId);
                        messagingTemplate.convertAndSendToUser(
                                        String.valueOf(userId),
                                        "/queue/errors",
                                        ApiResponse.error("도전 차례가 설정되지 않았습니다"));
                        return;
                }
                
                if (!currentChallenger.equals(userId)) {
                        log.warn("도전 차례 불일치 - roomId: {}, question: {}, currentChallenger: {}, submitUserId: {}", 
                                roomId, questionNumber, currentChallenger, userId);
                        messagingTemplate.convertAndSendToUser(
                                        String.valueOf(userId),
                                        "/queue/errors",
                                        ApiResponse.error("도전 차례가 아닙니다"));
                        return;
                }

                // 4. 정답 확인
                Long quizWordId = roomState.getQuizWordId(questionNumber);
                QuizWord quizWord = quizWordRepository.findByIdWithSign(quizWordId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.QUIZ_NOT_FOUND));

                String correctAnswer = quizWord.getSign().getTitle();

                // 5. FastAPI 인식 결과 확인 및 정답 검증
                // FastAPI 오류 메시지 감지 (오류:, 랜드마크, 데이터 없음 등)
                boolean isRecognitionFailed = (answer == null || answer.trim().isEmpty() 
                        || answer.contains("오류:") 
                        || answer.contains("랜드마크") 
                        || answer.contains("데이터 없음")
                        || (confidenceScore != null && confidenceScore == 0.0));
                
                boolean isCorrect = false;
                String failureReason = null;

                if (!isRecognitionFailed) {
                        // 신뢰도 점수 확인 (70% 이상)
                        if (confidenceScore == null || confidenceScore < 0.7) {
                                failureReason = String.format("신뢰도 부족 (%.1f%%)", 
                                        confidenceScore != null ? confidenceScore * 100 : 0);
                                log.info("신뢰도 부족 - userId: {}, question: {}, answer: {}, confidence: {}", 
                                        userId, questionNumber, answer, confidenceScore);
                        } else {
                                // 정답 매칭 검증 (DB 단어에 FastAPI 단어가 포함되는지 확인)
                                isCorrect = isAnswerMatching(correctAnswer, answer);
                                
                                if (!isCorrect) {
                                        failureReason = String.format("오답 (정답: %s, 인식: %s)", correctAnswer, answer);
                                }
                                
                                log.info("정답 검증 - userId: {}, question: {}, correctAnswer: {}, userAnswer: {}, confidence: {}, isCorrect: {}", 
                                        userId, questionNumber, correctAnswer, answer, confidenceScore, isCorrect);
                        }
                } else {
                        failureReason = "수어 인식 실패";
                        log.info("인식 실패 - userId: {}, question: {}, answer: {}, confidence: {}", 
                                userId, questionNumber, answer, confidenceScore);
                }

                Integer order = roomState.getChallengerOrder(questionNumber, userId);

                // 6. 점수 계산
                // - 정답 (신뢰도 70% 이상 + 단어 매칭): 순서별 점수 (100, 90, 80, 70)
                // - 오답 또는 신뢰도 부족: -50점
                // - 인식 실패: 0점 (점수 변동 없음)
                int score = isRecognitionFailed ? 0 : calculateScore(order, isCorrect);

                // 7. 캐시에서 기존 점수 가져와서 누적
                Integer currentScore = roomState.getUserScore(userId);
                int newScore = (currentScore != null ? currentScore : 0) + score;
                roomState.setUserScore(userId, newScore);

                log.info("점수 누적 - userId: {}, question: {}, isRecognitionFailed: {}, isCorrect: {}, addScore: {}, totalScore: {}",
                                userId, questionNumber, isRecognitionFailed, isCorrect, score, newScore);

                // 8. 도전자 정보 조회
                User challenger = userRepository.findById(userId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

                // 9. 결과 메시지 생성
                String resultMessage;
                if (isRecognitionFailed) {
                        resultMessage = "수어 인식에 실패했습니다";
                } else if (isCorrect) {
                        resultMessage = String.format("정답입니다! +%d점 (신뢰도: %.1f%%)", score, confidenceScore * 100);
                } else {
                        resultMessage = failureReason != null ? failureReason : "오답입니다";
                }

                // 10. 모든 참가자에게 결과 브로드캐스트
                messagingTemplate.convertAndSend(
                                "/topic/room/" + roomId + "/quiz/answer",
                                ApiResponse.success(resultMessage,
                                                AnswerResultResponse.builder()
                                                                .userId(userId)
                                                                .nickname(challenger.getNickname())
                                                                .isCorrect(isCorrect)
                                                                .score(score)
                                                                .totalScore(newScore)
                                                                .userAnswer(answer)
                                                                .correctAnswer(correctAnswer)
                                                                .confidenceScore(confidenceScore)
                                                                .resultMessage(resultMessage)
                                                                .build()));

                // 11. 결과를 보여주는 시간 (3초) 후 다음 단계로 이동
                // 람다 표현식에서 사용하기 위해 final 변수로 복사
                final boolean finalIsCorrect = isCorrect;
                final Long finalRoomId = roomId;
                final Integer finalQuestionNumber = questionNumber;

                CompletableFuture.delayedExecutor(3, TimeUnit.SECONDS)
                                .execute(() -> {
                                        if (finalIsCorrect) {
                                                // 정답 시 다음 문제로 이동
                                                moveToNextQuestion(finalRoomId, finalQuestionNumber);
                                        } else {
                                                // 오답 또는 인식 실패 시 다음 도전자에게 기회 넘김
                                                notifyNextChallenger(finalRoomId, finalQuestionNumber);
                                        }
                                });
        }

        /**
         * 정답 매칭 검증
         * 
         * DB에 저장된 단어(예: "인사,경례")에 FastAPI에서 인식한 단어(예: "인사")가 포함되는지 확인
         * 
         * @param correctAnswer DB에 저장된 정답 (쉼표로 구분된 여러 단어 가능)
         * @param userAnswer FastAPI에서 인식한 단어
         * @return 매칭 여부
         */
        private boolean isAnswerMatching(String correctAnswer, String userAnswer) {
                if (correctAnswer == null || userAnswer == null) {
                        return false;
                }

                // 공백 제거 및 소문자 변환
                String normalizedUserAnswer = userAnswer.trim().toLowerCase();
                String normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();

                // 1. 완전 일치 확인
                if (normalizedCorrectAnswer.equals(normalizedUserAnswer)) {
                        return true;
                }

                // 2. DB 단어에 쉼표가 있는 경우 (예: "인사,경례")
                if (normalizedCorrectAnswer.contains(",")) {
                        String[] correctWords = normalizedCorrectAnswer.split(",");
                        for (String word : correctWords) {
                                String trimmedWord = word.trim();
                                // 각 단어와 완전 일치하는지 확인
                                if (trimmedWord.equals(normalizedUserAnswer)) {
                                        return true;
                                }
                        }
                }

                // 3. DB 단어에 사용자 답변이 포함되는지 확인 (예: "인사,경례"에 "인사" 포함)
                if (normalizedCorrectAnswer.contains(normalizedUserAnswer)) {
                        return true;
                }

                return false;
        }

        /**
         * 게임 종료 처리
         *
         * [개선된 플로우]
         * 1. 캐시에서 이번 라운드 점수 조회
         * 2. 참가자 ID를 바탕으로 User 정보 "한 번에" 조회 (N+1 문제 해결)
         * 3. GameHistory 저장을 위해 리스트에 담아두기
         * 4. User totalScore 업데이트 (더티 체킹으로 자동 반영)
         * 5. GameHistory 리스트 "한 번에" 저장 (Bulk Insert)
         * 6. 최종 순위 계산 및 전송
         * 7. 대기실 복귀 및 캐시 정리
         */
        @Transactional
        public void endGame(Long roomId) {
                QuizStateCache.GameRoomState roomState = quizStateCache.getOrCreateRoomState(roomId);
                Map<Long, Integer> roundScores = roomState.getAllUserScores();

                GameRoom gameRoom = gameRoomRepository.findById(roomId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));
                Integer completedRound = gameRoom.getCurrentRound();

                // 모든 참가자 조회 (시도하지 않은 사람도 포함)
                List<GameParticipant> allParticipants = gameParticipantRepository.findAllByGameRoom_Id(roomId);
                
                // 모든 참가자의 점수를 포함 (시도하지 않은 사람은 0점)
                Map<Long, Integer> allScores = new java.util.HashMap<>();
                for (GameParticipant participant : allParticipants) {
                        Long userId = participant.getParticipant().getId();
                        Integer score = roundScores.getOrDefault(userId, 0);
                        allScores.put(userId, score);
                }

                // 최종 순위 계산 (이번 라운드 점수 기준)
                List<Map.Entry<Long, Integer>> sortedScores = allScores.entrySet().stream()
                                .sorted(Map.Entry.<Long, Integer>comparingByValue().reversed())
                                .collect(Collectors.toList());

                // --- N+1 쿼리 개선 로직 시작 ---

                // 1. 참가자들의 ID만 리스트로 추출합니다.
                List<Long> userIds = sortedScores.stream()
                                .map(Map.Entry::getKey)
                                .collect(Collectors.toList());

                // 2. ID 리스트를 사용해 "단 한 번의 쿼리"로 모든 User 객체를 가져와 Map 에 저장합니다.
                Map<Long, User> userMap = userRepository.findAllById(userIds).stream()
                                .collect(Collectors.toMap(User::getId, user -> user));

                // --- N+1 쿼리 개선 로직 끝 ---

                List<RankingInfo> rankings = new ArrayList<>();
                List<GameHistory> historiesToSave = new ArrayList<>();

                // 3. 랭킹 및 저장할 데이터 처리
                int rank = 1; // 실제 랭킹 (퇴장한 사람 제외)
                for (int i = 0; i < sortedScores.size(); i++) {
                        Map.Entry<Long, Integer> entry = sortedScores.get(i);
                        Long userId = entry.getKey();
                        Integer roundScore = entry.getValue() != null ? entry.getValue() : 0;

                        // DB를 다시 조회하는 대신, 미리 만들어 둔 Map 에서 User 객체를 가져옵니다. (쿼리 발생 X)
                        User user = userMap.get(userId);
                        if (user == null) {
                                // 게임 중 퇴장한 사용자는 랭킹에서 제외
                                log.info("게임 중 퇴장한 사용자 랭킹 제외 - userId: {}, score: {}", userId, roundScore);
                                continue;
                        }

                        // GameHistory 객체를 생성하여 리스트에 추가합니다. (DB에 바로 저장하지 않음)
                        historiesToSave.add(GameHistory.builder()
                                        .gameRoom(gameRoom)
                                        .participant(user)
                                        .score(roundScore)
                                        .round(completedRound)
                                        .build());

                        // User의 totalScore를 업데이트합니다.
                        // @Transactional 환경이므로, 트랜잭션 종료 시 변경된 내용을 감지(Dirty Checking)하여 자동으로 UPDATE 쿼리가
                        // 실행됩니다.
                        user.updateTotalScore(roundScore);

                        log.info("GameHistory 저장 및 User totalScore 누적 - userId: {}, roundScore: {}, newTotalScore: {}, rank: {}",
                                        userId, roundScore, user.getTotalScore(), rank);

                        // 순위 정보를 생성합니다.
                        rankings.add(RankingInfo.builder()
                                        .rank(rank)
                                        .userId(user.getId())
                                        .nickname(user.getNickname())
                                        .profileImageUrl(user.getProfileImageUrl())
                                        .score(roundScore)
                                        .build());

                        rank++; // 다음 순위로 증가
                }

                // 4. 준비된 GameHistory 리스트를 "한 번에" DB에 저장합니다. (Bulk Insert)
                gameHistoryRepository.saveAll(historiesToSave);

                log.info("게임 종료 - roomId: {}, completedRound: {}, participants: {}",
                                roomId, completedRound, sortedScores.size());

                // 5. 게임 종료 메시지를 전송합니다. (순위 발표 화면)
                messagingTemplate.convertAndSend(
                                "/topic/room/" + roomId + "/quiz",
                                ApiResponse.success("게임이 종료되었습니다", GameEndResponse.builder()
                                                .eventType("QUIZ_FINISHED")
                                                .completedRound(completedRound)
                                                .nextRound(completedRound + 1)
                                                .rankings(rankings)
                                                .showReturnButton(true) // "방으로 돌아가기" 버튼 표시
                                                .build()));

                // 6. 대기실로 복귀합니다.
                gameRoom.proceedToNextRound();
                gameRoom.updateStatus(GameRoomStatus.WAITING);

                log.info("대기실 복귀 완료 - roomId: {}, nextRound: {}, status: WAITING",
                                roomId, gameRoom.getCurrentRound());

                // 7. 캐시를 정리합니다.
                quizStateCache.clearRoomState(roomId);
        }

        /**
         * 방으로 돌아가기 (게임 종료 후)
         * 
         * 게임 종료 후 순위 발표 화면에서 "방으로 돌아가기" 버튼 클릭 시 호출
         * - 최초 입장처럼 전체 방 정보를 다시 전송하여 대기실 화면 렌더링
         * - 방 상태는 이미 endGame()에서 WAITING으로 변경되어 있음
         */
        @Transactional(readOnly = true)
        public void returnToWaitingRoom(Long roomId, Long userId) {
                // 1. 방 존재 확인
                GameRoom gameRoom = gameRoomRepository.findById(roomId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));

                // 2. 게임 상태 확인 (대기 상태인지)
                validateGameWaiting(gameRoom);

                // 3. 참가자 확인
                gameParticipantRepository.findByGameRoom_IdAndParticipant_Id(roomId, userId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.PARTICIPANT_NOT_FOUND));

                log.info("방으로 돌아가기 - userId: {}, roomId: {}, status: {}",
                                userId, roomId, gameRoom.getStatus());

                // 3. 전체 참가자 정보 조회 (최초 입장과 동일한 정보)
                List<GameParticipant> allParticipants = gameParticipantRepository
                                .findAllByGameRoom_Id(roomId);

                List<app.signbell.backend.dto.response.ParticipantResponse> participantResponses = allParticipants
                                .stream()
                                .map(gp -> app.signbell.backend.dto.response.ParticipantResponse.builder()
                                                .userId(gp.getParticipant().getId())
                                                .nickname(gp.getParticipant().getNickname())
                                                .profileImageUrl(gp.getParticipant().getProfileImageUrl())
                                                .isHost(gp.isHost())
                                                .isReady(gp.isReady())
                                                .build())
                                .collect(java.util.stream.Collectors.toList());

                // 4. 전체 방 정보 생성 (최초 입장과 동일)
                app.signbell.backend.dto.response.JoinRoomResponse roomInfo = app.signbell.backend.dto.response.JoinRoomResponse
                                .of(gameRoom, participantResponses);

                // 5. 대기실로 이동 메시지 + 전체 방 정보 브로드캐스트
                messagingTemplate.convertAndSend(
                                "/topic/room/" + roomId + "/quiz",
                                ApiResponse.success("대기실로 이동합니다",
                                                java.util.Map.of(
                                                                "eventType", "RETURN_TO_WAITING_ROOM",
                                                                "roomInfo", roomInfo // 전체 방 정보 포함
                                                )));
        }

        /**
         * 점수 계산 (도전 순서 기반)
         * - 정답: 1등 100점, 2등 90점, 3등 80점, 4등 70점
         * - 오답: -50점
         */
        private int calculateScore(Integer order, boolean isCorrect) {
                if (order == null)
                        return 0;

                // 오답 시 -50점
                if (!isCorrect) {
                        return -50;
                }

                // 정답 시 순서별 점수
                switch (order) {
                        case 1:
                                return 100;
                        case 2:
                                return 90;
                        case 3:
                                return 80;
                        case 4:
                                return 70;
                        default:
                                return 0;
                }
        }

        // ============================================
        // 검증 메서드들
        // ============================================

        /**
         * 게임이 진행 중인지 확인
         */
        private void validateGameInProgress(Long roomId) {
                GameRoom gameRoom = gameRoomRepository.findById(roomId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));

                if (gameRoom.getStatus() != GameRoomStatus.IN_PROGRESS) {
                        throw new BusinessException(ErrorCode.GAME_NOT_IN_PROGRESS);
                }
        }

        /**
         * 게임이 시작되지 않았는지 확인
         */
        private void validateGameNotStarted(GameRoom gameRoom) {
                if (gameRoom.getStatus() == GameRoomStatus.IN_PROGRESS) {
                        throw new BusinessException(ErrorCode.ROOM_ALREADY_STARTED);
                }
                if (gameRoom.getStatus() == GameRoomStatus.FINISHED) {
                        throw new BusinessException(ErrorCode.ROOM_ALREADY_FINISHED);
                }
        }

        /**
         * 문제 번호 유효성 검증
         */
        private void validateQuestionNumber(Integer questionNumber) {
                if (questionNumber == null || questionNumber < 1 || questionNumber > 8) {
                        throw new BusinessException(ErrorCode.INVALID_QUESTION_NUMBER);
                }
        }

        /**
         * 게임이 대기 상태인지 확인
         */
        private void validateGameWaiting(GameRoom gameRoom) {
                if (gameRoom.getStatus() != GameRoomStatus.WAITING) {
                        throw new BusinessException(ErrorCode.GAME_STILL_IN_PROGRESS);
                }
        }

        private void moveToNextQuestion(Long roomId, Integer currentQuestion) {
                if (currentQuestion >= 8) {
                        // 게임 종료
                        endGame(roomId);
                        return;
                }

                Integer nextQuestion = currentQuestion + 1;
                QuizStateCache.GameRoomState roomState = quizStateCache.getOrCreateRoomState(roomId);
                Long nextQuizWordId = roomState.getQuizWordId(nextQuestion);

                if (nextQuizWordId == null) {
                        endGame(roomId);
                        return;
                }

                QuizWord nextQuiz = quizWordRepository.findByIdWithSign(nextQuizWordId)
                                .orElseThrow(() -> new BusinessException(ErrorCode.QUIZ_NOT_FOUND));

                log.info("다음 문제 이동 - roomId: {}, nextQuestion: {}, wordTitle: {}",
                                roomId, nextQuestion, nextQuiz.getSign().getTitle());

                messagingTemplate.convertAndSend(
                                "/topic/room/" + roomId + "/quiz",
                                ApiResponse.success("다음 문제", NextQuestionResponse.builder()
                                                .questionNumber(nextQuestion)
                                                .totalQuestions(8)
                                                .wordTitle(nextQuiz.getSign().getTitle())
                                                .build()));

                // 다음 문제 도전 신청 타임아웃 스케줄링 (10초)
                scheduleChallengeTimeout(roomId, nextQuestion);

                // 도전 신청 타이머 시작 (10초)
                startChallengeTimer(roomId, nextQuestion);
        }

        /**
         * 도전 신청 타임아웃 스케줄링
         * 
         * 문제 시작 후 10초가 지나면 자동으로 도전 신청을 마감하고,
         * 신청한 사람이 없으면 다음 문제로 이동합니다.
         * 
         * @param roomId         게임방 ID
         * @param questionNumber 문제 번호
         */
        private void scheduleChallengeTimeout(Long roomId, Integer questionNumber) {
                CompletableFuture.delayedExecutor(10, TimeUnit.SECONDS)
                                .execute(() -> {
                                        try {
                                                handleChallengeTimeout(roomId, questionNumber);
                                        } catch (Exception e) {
                                                log.error("도전 신청 타임아웃 처리 중 오류 발생 - roomId: {}, question: {}",
                                                                roomId, questionNumber, e);
                                        }
                                });

                log.info("도전 신청 타임아웃 스케줄링 - roomId: {}, question: {}, timeout: 10초",
                                roomId, questionNumber);
        }

        /**
         * 도전 신청 타임아웃 처리
         * 
         * 10초 후 실행되며, 다음을 확인합니다:
         * 1. 아직 같은 문제에 있는지 (정답자가 나와서 다음 문제로 넘어가지 않았는지)
         * 2. 도전 신청한 사람이 있는지
         * 3. 없으면 다음 문제로 강제 이동
         * 
         * @param roomId         게임방 ID
         * @param questionNumber 문제 번호
         */
        private void handleChallengeTimeout(Long roomId, Integer questionNumber) {
                QuizStateCache.GameRoomState roomState = quizStateCache.getOrCreateRoomState(roomId);

                // 현재 도전자 확인 (이미 도전이 시작되었는지)
                Long currentChallenger = roomState.getCurrentChallenger(questionNumber);

                if (currentChallenger != null) {
                        // 이미 도전이 시작됨 - 타임아웃 무시
                        log.info("도전 신청 타임아웃 - 이미 도전 진행 중 - roomId: {}, question: {}",
                                        roomId, questionNumber);
                        return;
                }

                // 도전 신청한 사람이 있는지 확인
                Integer challengerCount = roomState.getChallengerCount(questionNumber);

                if (challengerCount == 0) {
                        // 아무도 도전 신청 안 함 - 다음 문제로 강제 이동
                        log.info("도전 신청 타임아웃 - 도전자 없음 - roomId: {}, question: {}",
                                        roomId, questionNumber);

                        // 모든 참가자에게 알림
                        messagingTemplate.convertAndSend(
                                        "/topic/room/" + roomId + "/quiz",
                                        ApiResponse.success("도전 신청 시간이 종료되었습니다. 다음 문제로 이동합니다.",
                                                        Map.of("eventType", "CHALLENGE_TIMEOUT",
                                                                        "questionNumber", questionNumber)));

                        // 다음 문제로 이동
                        moveToNextQuestion(roomId, questionNumber);
                } else {
                        // 도전 신청한 사람이 있음 - 첫 번째 도전자에게 차례 부여
                        log.info("도전 신청 타임아웃 - 도전자 {}명 - roomId: {}, question: {}",
                                        challengerCount, roomId, questionNumber);

                        // 첫 번째 도전자 설정 및 알림
                        Long firstChallenger = roomState.getFirstChallenger(questionNumber);
                        if (firstChallenger != null) {
                                roomState.setCurrentChallenger(questionNumber, firstChallenger);

                                // 도전자 정보 조회
                                User challenger = userRepository.findById(firstChallenger)
                                                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

                                messagingTemplate.convertAndSend(
                                                "/topic/room/" + roomId + "/quiz",
                                                ApiResponse.success("도전 신청이 마감되었습니다. 도전자 차례입니다.",
                                                                NextChallengerResponse.builder()
                                                                                .userId(firstChallenger)
                                                                                .nickname(challenger.getNickname())
                                                                                .profileImage(challenger
                                                                                                .getProfileImageUrl())
                                                                                .questionNumber(questionNumber)
                                                                                .build()));

                                log.info("도전 신청 마감 - 첫 번째 도전자 알림 - userId: {}, question: {}",
                                                firstChallenger, questionNumber);

                                // 수어 준비 타이머 시작 (5초)
                                startPrepareTimer(roomId, questionNumber, firstChallenger);

                                // 5초 후 수어 표현 타이머 시작 (10초)
                                CompletableFuture.delayedExecutor(5, TimeUnit.SECONDS)
                                                .execute(() -> startSigningTimer(roomId, questionNumber,
                                                                firstChallenger));
                        }
                }
        }

        private void notifyNextChallenger(Long roomId, Integer questionNumber) {
                QuizStateCache.GameRoomState roomState = quizStateCache.getOrCreateRoomState(roomId);

                Long nextChallenger = roomState.getNextChallenger(questionNumber);

                if (nextChallenger != null) {
                        log.info("다음 도전자 알림 - userId: {}, question: {}", nextChallenger, questionNumber);

                        // 도전자 정보 조회
                        User challenger = userRepository.findById(nextChallenger)
                                        .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));

                        messagingTemplate.convertAndSend(
                                        "/topic/room/" + roomId + "/quiz",
                                        ApiResponse.success("다음 도전자 차례", NextChallengerResponse.builder()
                                                        .userId(nextChallenger)
                                                        .nickname(challenger.getNickname())
                                                        .profileImage(challenger.getProfileImageUrl())
                                                        .questionNumber(questionNumber)
                                                        .build()));

                        // 수어 준비 타이머 시작 (5초)
                        startPrepareTimer(roomId, questionNumber, nextChallenger);

                        // 5초 후 수어 표현 타이머 시작 (10초)
                        CompletableFuture.delayedExecutor(5, TimeUnit.SECONDS)
                                        .execute(() -> startSigningTimer(roomId, questionNumber, nextChallenger));
                } else {
                        // 모두 실패 - 다음 문제로
                        log.info("모두 실패 - roomId: {}, question: {}", roomId, questionNumber);
                        moveToNextQuestion(roomId, questionNumber);
                }
        }

        /**
         * 도전 신청 타이머 시작 (10초)
         * 
         * 1초마다 남은 시간을 WebSocket으로 전송
         * 
         * @param roomId         게임방 ID
         * @param questionNumber 문제 번호
         */
        private void startChallengeTimer(Long roomId, Integer questionNumber) {
                for (int i = 10; i >= 0; i--) {
                        final int remainingSeconds = i;
                        CompletableFuture.delayedExecutor(10 - i, TimeUnit.SECONDS)
                                        .execute(() -> {
                                                try {
                                                        messagingTemplate.convertAndSend(
                                                                        "/topic/room/" + roomId + "/quiz/timer",
                                                                        ApiResponse.success("타이머 업데이트",
                                                                                        TimerUpdateResponse.builder()
                                                                                                        .timerType("CHALLENGE")
                                                                                                        .remainingSeconds(
                                                                                                                        remainingSeconds)
                                                                                                        .questionNumber(questionNumber)
                                                                                                        .build()));
                                                } catch (Exception e) {
                                                        log.error("타이머 전송 중 오류 - roomId: {}, remaining: {}",
                                                                        roomId, remainingSeconds, e);
                                                }
                                        });
                }
                log.info("도전 신청 타이머 시작 - roomId: {}, question: {}", roomId, questionNumber);
        }

        /**
         * 수어 준비 타이머 시작 (5초)
         * 
         * 1초마다 남은 시간을 WebSocket으로 전송
         * 
         * @param roomId           게임방 ID
         * @param questionNumber   문제 번호
         * @param challengerUserId 도전자 ID
         */
        private void startPrepareTimer(Long roomId, Integer questionNumber, Long challengerUserId) {
                for (int i = 5; i >= 0; i--) {
                        final int remainingSeconds = i;
                        CompletableFuture.delayedExecutor(5 - i, TimeUnit.SECONDS)
                                        .execute(() -> {
                                                try {
                                                        messagingTemplate.convertAndSend(
                                                                        "/topic/room/" + roomId + "/quiz/timer",
                                                                        ApiResponse.success("타이머 업데이트",
                                                                                        TimerUpdateResponse.builder()
                                                                                                        .timerType("PREPARE")
                                                                                                        .remainingSeconds(
                                                                                                                        remainingSeconds)
                                                                                                        .questionNumber(questionNumber)
                                                                                                        .challengerUserId(
                                                                                                                        challengerUserId)
                                                                                                        .build()));
                                                } catch (Exception e) {
                                                        log.error("타이머 전송 중 오류 - roomId: {}, remaining: {}",
                                                                        roomId, remainingSeconds, e);
                                                }
                                        });
                }
                log.info("수어 준비 타이머 시작 - roomId: {}, question: {}, challenger: {}",
                                roomId, questionNumber, challengerUserId);
        }

        /**
         * 수어 표현 타이머 시작 (5초)
         * 
         * 1초마다 남은 시간을 WebSocket으로 전송
         * 
         * @param roomId           게임방 ID
         * @param questionNumber   문제 번호
         * @param challengerUserId 도전자 ID
         */
        private void startSigningTimer(Long roomId, Integer questionNumber, Long challengerUserId) {
                for (int i = 5; i >= 0; i--) {
                        final int remainingSeconds = i;
                        CompletableFuture.delayedExecutor(5 - i, TimeUnit.SECONDS)
                                        .execute(() -> {
                                                try {
                                                        messagingTemplate.convertAndSend(
                                                                        "/topic/room/" + roomId + "/quiz/timer",
                                                                        ApiResponse.success("타이머 업데이트",
                                                                                        TimerUpdateResponse.builder()
                                                                                                        .timerType("SIGNING")
                                                                                                        .remainingSeconds(
                                                                                                                        remainingSeconds)
                                                                                                        .questionNumber(questionNumber)
                                                                                                        .challengerUserId(
                                                                                                                        challengerUserId)
                                                                                                        .build()));
                                                } catch (Exception e) {
                                                        log.error("타이머 전송 중 오류 - roomId: {}, remaining: {}",
                                                                        roomId, remainingSeconds, e);
                                                }
                                        });
                }
                log.info("수어 표현 타이머 시작 - roomId: {}, question: {}, challenger: {}",
                                roomId, questionNumber, challengerUserId);
        }
}