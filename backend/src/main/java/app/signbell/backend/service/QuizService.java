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

/**
 * QuizService 클래스
 *
 * 퀴즈 게임의 전반적인 로직을 관리하는 서비스 클래스. 게임방, 참가자, 퀴즈 단어, 게임 기록 등
 * 여러 리소스를 처리하며 게임 시작, 정답 제출, 게임 종료 등을 수행함.
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

        // 2. 최소 인원 확인 (2명 이상)
        List<GameParticipant> allParticipants = gameParticipantRepository
                .findAllByGameRoom_Id(roomId);

        if (allParticipants.size() < 2) {
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

        // 7. 첫 번째 문제 정보 전송 (단어 제목만)
        QuizWord firstQuiz = selectedWords.get(0);
        QuizStartResponse response = QuizStartResponse.builder()
                .questionNumber(1)
                .totalQuestions(8)
                .wordTitle(firstQuiz.getSign().getTitle())
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
        Integer order = roomState.getChallengerOrder(questionNumber, userId);

        // 3. 점수 계산 (정답: 순서별 점수, 오답: -50점)
        int score = calculateScore(order, isCorrect);

        // 4. 캐시에서 기존 점수 가져와서 누적
        Integer currentScore = roomState.getUserScore(userId);
        int newScore = (currentScore != null ? currentScore : 0) + score;
        roomState.setUserScore(userId, newScore);

        log.info("점수 누적 - userId: {}, question: {}, isCorrect: {}, addScore: {}, totalScore: {}",
                userId, questionNumber, isCorrect, score, newScore);

        // 5. 결과 메시지 전송
        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/quiz",
                ApiResponse.success(isCorrect ? "정답입니다!" : "오답입니다", 
                        AnswerResultResponse.builder()
                                .userId(userId)
                                .isCorrect(isCorrect)
                                .score(score)
                                .totalScore(newScore)
                                .build())
        );

        if (isCorrect) {
            // 6. 정답 시 다음 문제로 이동
            moveToNextQuestion(roomId, questionNumber);
        } else {
            // 7. 오답 시 다음 도전자에게 기회 넘김
            notifyNextChallenger(roomId, questionNumber);
        }
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

        // 최종 순위 계산 (이번 라운드 점수 기준)
        List<Map.Entry<Long, Integer>> sortedScores = roundScores.entrySet().stream()
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
        for (int i = 0; i < sortedScores.size(); i++) {
            Map.Entry<Long, Integer> entry = sortedScores.get(i);
            Long userId = entry.getKey();
            Integer roundScore = entry.getValue() != null ? entry.getValue() : 0;

            // DB를 다시 조회하는 대신, 미리 만들어 둔 Map 에서 User 객체를 가져옵니다. (쿼리 발생 X)
            User user = userMap.get(userId);
            if (user == null) {
                log.warn("랭킹 처리 중 ID {} 에 해당하는 유저를 찾을 수 없습니다.", userId);
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
            // @Transactional 환경이므로, 트랜잭션 종료 시 변경된 내용을 감지(Dirty Checking)하여 자동으로 UPDATE 쿼리가 실행됩니다.
            user.updateTotalScore(roundScore);

            log.info("GameHistory 저장 및 User totalScore 누적 - userId: {}, roundScore: {}, newTotalScore: {}, rank: {}",
                    userId, roundScore, user.getTotalScore(), i + 1);

            // 순위 정보를 생성합니다.
            rankings.add(RankingInfo.builder()
                    .rank(i + 1)
                    .userId(user.getId())
                    .nickname(user.getNickname())
                    .profileImageUrl(user.getProfileImageUrl())
                    .score(roundScore)
                    .build());
        }

        // 4. 준비된 GameHistory 리스트를 "한 번에" DB에 저장합니다. (Bulk Insert)
        gameHistoryRepository.saveAll(historiesToSave);

        log.info("게임 종료 - roomId: {}, completedRound: {}, participants: {}",
                roomId, completedRound, sortedScores.size());

        // 5. 게임 종료 메시지를 전송합니다.
        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/quiz",
                ApiResponse.success("게임이 종료되었습니다", GameEndResponse.builder()
                        .eventType("QUIZ_FINISHED")
                        .completedRound(completedRound)
                        .nextRound(completedRound + 1)
                        .rankings(rankings)
                        .backToWaitingRoom(true)
                        .delaySeconds(5)
                        .build())
        );

        // 6. 대기실로 복귀합니다.
        gameRoom.proceedToNextRound();
        gameRoom.updateStatus(GameRoomStatus.WAITING);

        log.info("대기실 복귀 완료 - roomId: {}, nextRound: {}, status: WAITING",
                roomId, gameRoom.getCurrentRound());

        // 7. 캐시를 정리합니다.
        quizStateCache.clearRoomState(roomId);
    }

    /**
     * 점수 계산 (도전 순서 기반)
     * - 정답: 1등 100점, 2등 90점, 3등 80점, 4등 70점
     * - 오답: -50점
     */
    private int calculateScore(Integer order, boolean isCorrect) {
        if (order == null) return 0;
        
        // 오답 시 -50점
        if (!isCorrect) {
            return -50;
        }

        // 정답 시 순서별 점수
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

        log.info("다음 문제 이동 - roomId: {}, nextQuestion: {}, wordTitle: {}", 
                roomId, nextQuestion, nextQuiz.getSign().getTitle());

        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/quiz",
                ApiResponse.success("다음 문제", NextQuestionResponse.builder()
                        .questionNumber(nextQuestion)
                        .totalQuestions(8)
                        .wordTitle(nextQuiz.getSign().getTitle())
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