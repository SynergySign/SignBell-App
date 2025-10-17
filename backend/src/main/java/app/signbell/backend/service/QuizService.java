package app.signbell.backend.service;

import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.dto.quiz.*;
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
import java.util.stream.Collectors;

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

        // 2. 최소 인원 확인 (3명 이상)
        List<GameParticipant> allParticipants = gameParticipantRepository
                .findAllByGameRoom_Id(roomId);

        if (allParticipants.size() < 3) {
            throw new BusinessException(ErrorCode.ROOM_MIN_PARTICIPANTS_NOT_MET);
        }

        // 3. 퀴즈 단어 개수 확인
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

        // 7. 첫 번째 문제 정보 전송
        QuizWord firstQuiz = selectedWords.get(0);
        QuizStartResponse response = QuizStartResponse.builder()
                .questionNumber(1)
                .totalQuestions(8)
                .videoUrl(firstQuiz.getSign().getUrl())
                .signDescription(firstQuiz.getSign().getSignDescription())
                .build();

        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/quiz",
                ApiResponse.success("게임이 시작되었습니다", response)
        );

        return GameStartResponse.builder()
                .totalQuestions(8)
                .build();
    }

    @Transactional
    public void registerChallenge(Long roomId, Long userId, Integer questionNumber) {
        // 1. 참가자 확인
        GameParticipant participant = gameParticipantRepository
                .findByGameRoom_IdAndParticipant_Id(roomId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARTICIPANT_NOT_FOUND));

        QuizStateCache.GameRoomState roomState = quizStateCache.getOrCreateRoomState(roomId);

        // 2. 도전권 등록 (최대 4명)
        boolean registered = roomState.addChallenger(questionNumber, userId);

        if (registered) {
            Integer order = roomState.getChallengerOrder(questionNumber, userId);
            log.info("도전권 획득 - userId: {}, roomId: {}, question: {}, order: {}",
                    userId, roomId, questionNumber, order);

            // 3. 첫 번째 도전자라면 차례 알림
            if (order == 1) {
                roomState.setCurrentChallenger(questionNumber, userId);

                messagingTemplate.convertAndSend(
                        "/topic/room/" + roomId + "/quiz",
                        ApiResponse.success("도전자 차례", NextChallengerResponse.builder()
                                .userId(userId)
                                .questionNumber(questionNumber)
                                .build())
                );

                log.info("다음 도전자 알림 - userId: {}, question: {}", userId, questionNumber);
            }
        } else {
            // 4. 도전권 초과
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(userId),
                    "/queue/errors",
                    ApiResponse.error("도전권이 마감되었습니다")
            );
        }
    }

    @Transactional
    public void submitAnswer(Long roomId, Long userId, Integer questionNumber, String answer) {
        QuizStateCache.GameRoomState roomState = quizStateCache.getOrCreateRoomState(roomId);

        // 1. 도전 차례 확인
        Long currentChallenger = roomState.getCurrentChallenger(questionNumber);
        if (currentChallenger == null || !currentChallenger.equals(userId)) {
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(userId),
                    "/queue/errors",
                    ApiResponse.error("도전 차례가 아닙니다")
            );
            return;
        }

        // 2. 정답 확인
        Long quizWordId = roomState.getQuizWordId(questionNumber);
        QuizWord quizWord = quizWordRepository.findById(quizWordId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUIZ_NOT_FOUND));

        boolean isCorrect = quizWord.getSign().getTitle().equals(answer);

        if (isCorrect) {
            // 3. 정답 처리 - 점수 캐시에 누적
            Integer order = roomState.getChallengerOrder(questionNumber, userId);
            int score = calculateScore(order);

            // 캐시에서 기존 점수 가져와서 누적
            Integer currentScore = roomState.getUserScore(userId);
            int newScore = (currentScore != null ? currentScore : 0) + score;
            roomState.setUserScore(userId, newScore);

            log.info("점수 누적 - userId: {}, question: {}, addScore: {}, totalScore: {}",
                    userId, questionNumber, score, newScore);

            // 정답 메시지 전송
            messagingTemplate.convertAndSend(
                    "/topic/room/" + roomId + "/quiz",
                    ApiResponse.success("정답입니다!", AnswerResultResponse.builder()
                            .userId(userId)
                            .isCorrect(true)
                            .score(score)
                            .totalScore(newScore)
                            .build())
            );

            // 다음 문제로 이동
            moveToNextQuestion(roomId, questionNumber);

        } else {
            // 4. 오답 처리
            log.info("오답 - userId: {}, question: {}", userId, questionNumber);

            messagingTemplate.convertAndSend(
                    "/topic/room/" + roomId + "/quiz",
                    ApiResponse.success("오답입니다", AnswerResultResponse.builder()
                            .userId(userId)
                            .isCorrect(false)
                            .build())
            );

            // 다음 도전자에게 기회 넘김
            notifyNextChallenger(roomId, questionNumber);
        }
    }

    @Transactional
    public void handleTimeout(Long roomId, Long userId, Integer questionNumber) {
        QuizStateCache.GameRoomState roomState = quizStateCache.getOrCreateRoomState(roomId);

        // 1. 현재 도전자 확인
        Long currentChallenger = roomState.getCurrentChallenger(questionNumber);
        if (currentChallenger == null || !currentChallenger.equals(userId)) {
            return;
        }

        log.info("타임아웃 처리 - userId: {}, roomId: {}, question: {}", userId, roomId, questionNumber);

        // 2. 다음 도전자에게 기회 넘김
        notifyNextChallenger(roomId, questionNumber);
    }

    @Transactional
    public void endGame(Long roomId) {
        QuizStateCache.GameRoomState roomState = quizStateCache.getOrCreateRoomState(roomId);

        // 1. 캐시에서 모든 참가자의 최종 점수 가져오기
        Map<Long, Integer> finalScores = roomState.getAllUserScores();

        // 2. GameHistory에 저장
        GameRoom gameRoom = gameRoomRepository.findById(roomId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));

        for (Map.Entry<Long, Integer> entry : finalScores.entrySet()) {
            Long userId = entry.getKey();
            Integer score = entry.getValue();

            if (score != null && score > 0) {
                User user = userRepository.findById(userId)
                        .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

                GameHistory history = GameHistory.builder()
                        .gameRoom(gameRoom)
                        .participant(user)
                        .score(score)
                        .round(gameRoom.getCurrentRound())
                        .build();

                gameHistoryRepository.save(history);

                log.info("GameHistory 저장 - userId: {}, score: {}", userId, score);
            }
        }

        // 3. 상위 3명 조회
        List<GameHistory> topThree = gameHistoryRepository
                .findTop3ByGameRoom_IdOrderByScoreDesc(roomId);

        log.info("게임 종료 - roomId: {}, topThree: {}", roomId, topThree.size());

        // 4. 게임 종료 메시지 전송
        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/quiz",
                ApiResponse.success("게임이 종료되었습니다", GameEndResponse.builder()
                        .rankings(topThree.stream()
                                .map(h -> RankingInfo.builder()
                                        .userId(h.getParticipant().getId())
                                        .nickname(h.getParticipant().getNickname())
                                        .score(h.getScore())
                                        .build())
                                .collect(Collectors.toList()))
                        .build())
        );

        // 5. 방 상태 변경
        gameRoom.updateStatus(GameRoomStatus.FINISHED);

        // 6. 캐시 정리
        quizStateCache.clearRoomState(roomId);
    }

    private int calculateScore(Integer order) {
        if (order == null) return 0;

        switch (order) {
            case 1: return 100;
            case 2: return 90;
            case 3: return 80;
            case 4: return 70;
            default: return 0;
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

        QuizWord nextQuiz = quizWordRepository.findById(nextQuizWordId)
                .orElseThrow(() -> new BusinessException(ErrorCode.QUIZ_NOT_FOUND));

        log.info("다음 문제 이동 - roomId: {}, nextQuestion: {}", roomId, nextQuestion);

        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/quiz",
                ApiResponse.success("다음 문제", NextQuestionResponse.builder()
                        .questionNumber(nextQuestion)
                        .totalQuestions(8)
                        .videoUrl(nextQuiz.getSign().getUrl())
                        .signDescription(nextQuiz.getSign().getSignDescription())
                        .build())
        );
    }

    private void notifyNextChallenger(Long roomId, Integer questionNumber) {
        QuizStateCache.GameRoomState roomState = quizStateCache.getOrCreateRoomState(roomId);

        Long nextChallenger = roomState.getNextChallenger(questionNumber);

        if (nextChallenger != null) {
            log.info("다음 도전자 알림 - userId: {}, question: {}", nextChallenger, questionNumber);

            messagingTemplate.convertAndSend(
                    "/topic/room/" + roomId + "/quiz",
                    ApiResponse.success("다음 도전자 차례", NextChallengerResponse.builder()
                            .userId(nextChallenger)
                            .questionNumber(questionNumber)
                            .build())
            );
        } else {
            // 모두 실패 - 다음 문제로
            log.info("모두 실패 - roomId: {}, question: {}", roomId, questionNumber);
            moveToNextQuestion(roomId, questionNumber);
        }
    }
}