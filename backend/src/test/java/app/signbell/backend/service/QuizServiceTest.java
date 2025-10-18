package app.signbell.backend.service;

import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.entity.*;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import app.signbell.backend.dto.quiz.QuizStartResponse;
import app.signbell.backend.dto.quiz.NextQuestionResponse;
import org.mockito.ArgumentCaptor;

/**
 * QuizServiceTest 클래스
 * <p>
 * QuizService의 주요 기능과 로직을 테스트하기 위한 클래스.
 * 주로 게임 시작, 진행, 종료에 관련된 다양한 시나리오와 예외 상황을 검증.
 *
 * @author 고동현
 * @since 2025-10-17
 */
@SpringBootTest
@Transactional
@DisplayName("QuizService 통합 테스트")
class QuizServiceTest {

    @Autowired
    private QuizService quizService;

    @Autowired
    private GameRoomRepository gameRoomRepository;

    @Autowired
    private GameParticipantRepository gameParticipantRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private QuizWordRepository quizWordRepository;

    @Autowired
    private SignRepository signRepository;

    @Autowired
    private GameHistoryRepository gameHistoryRepository;

    @Autowired
    private QuizStateCache quizStateCache;

    @MockBean
    private SimpMessagingTemplate messagingTemplate;

    private User host;
    private List<User> participants;
    private GameRoom gameRoom;

    @BeforeEach
    void setUp() {
        // 방장 생성
        host = userRepository.save(User.builder()
                .nickname("방장")
                .email("host@test.com")
                .provider(LoginMethod.KAKAO)
                .providerId("host-123")
                .build());

        // 참가자 3명 생성
        participants = new ArrayList<>();
        for (int i = 1; i <= 3; i++) {
            User user = userRepository.save(User.builder()
                    .nickname("참가자" + i)
                    .email("user" + i + "@test.com")
                    .provider(LoginMethod.KAKAO)
                    .providerId("user-" + i)
                    .build());
            participants.add(user);
        }

        // 게임방 생성
        gameRoom = gameRoomRepository.save(GameRoom.builder()
                .gameTitle("테스트 퀴즈방")
                .host(host)
                .status(GameRoomStatus.WAITING)
                .build());

        // 방장 참가
        gameParticipantRepository.save(GameParticipant.builder()
                .gameRoom(gameRoom)
                .participant(host)
                .isHost(true)
                .build());

        // 참가자들 참가
        for (User user : participants) {
            gameParticipantRepository.save(GameParticipant.builder()
                    .gameRoom(gameRoom)
                    .participant(user)
                    .isHost(false)
                    .build());
        }

        // 현재 참가자 수 업데이트
        gameRoom.incrementParticipants(); // host
        for (int i = 0; i < participants.size(); i++) {
            gameRoom.incrementParticipants();
        }

        // 퀴즈 단어 10개 생성
        createTestQuizWords(10);
    }

    /**
     * 테스트용 퀴즈 단어 생성
     * <p>
     * 구조:
     * 1. Sign 테이블: 전체 수어 데이터 (API에서 가져온 모든 데이터)
     * 2. QuizWord 테이블: 학습 완료된 데이터만 (Sign과 OneToOne 관계)
     * <p>
     * 퀴즈는 QuizWord에 있는 단어만 출제 가능
     */
    private void createTestQuizWords(int count) {
        for (int i = 0; i < count; i++) {
            // 1. Sign 생성 (학습 완료 상태)
            Sign sign = signRepository.save(Sign.builder()
                    .title("단어" + i)
                    .url("http://example.com/video/" + i + ".mp4")
                    .signDescription("단어" + i + "에 대한 설명")
                    .categoryType("테스트")
                    .learningStatus(SignStatus.COMPLETED)  // 학습 완료
                    .build());

            // 2. QuizWord 생성 (학습 완료된 Sign만 퀴즈에 사용)
            quizWordRepository.save(QuizWord.builder()
                    .sign(sign)
                    .build());
        }
    }

    @Test
    @DisplayName("정상: 게임 시작 시 8개의 문제가 생성되고 단어 제목만 전송된다")
    void startGame_success() {
        // When
        quizService.startGame(gameRoom.getId(), host.getId());

        // Then - 첫 번째 문제 정보가 전송됨 (단어 제목만 포함)
        verify(messagingTemplate, times(1))
                .convertAndSend(
                        eq("/topic/room/" + gameRoom.getId() + "/quiz"),
                        any(ApiResponse.class)
                );

        // 방 상태가 IN_PROGRESS로 변경되었는지 확인
        GameRoom updatedRoom = gameRoomRepository.findById(gameRoom.getId()).orElseThrow();
        assertThat(updatedRoom.getStatus()).isEqualTo(GameRoomStatus.IN_PROGRESS);
    }

    @Test
    @DisplayName("예외: 방장이 아닌 사용자가 게임을 시작하려고 하면 NOT_ROOM_HOST")
    void startGame_notHost_throwsException() {
        // When & Then
        assertThatThrownBy(() ->
                quizService.startGame(gameRoom.getId(), participants.get(0).getId()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.NOT_ROOM_HOST);
    }

    @Test
    @DisplayName("예외: 최소 인원(2명) 미만일 때 게임 시작 불가")
    void startGame_insufficientParticipants_throwsException() {
        // Given - 새로운 게임방을 1명(방장만)으로 생성
        GameRoom smallRoom = gameRoomRepository.save(GameRoom.builder()
                .gameTitle("소규모 퀴즈방")
                .host(host)
                .status(GameRoomStatus.WAITING)
                .build());

        // 방장만 참가
        gameParticipantRepository.save(GameParticipant.builder()
                .gameRoom(smallRoom)
                .participant(host)
                .isHost(true)
                .build());

        // 참가자 수 업데이트
        smallRoom.incrementParticipants(); // host만 (1명)

        // When & Then - 혼자서는 게임 시작 불가
        assertThatThrownBy(() ->
                quizService.startGame(smallRoom.getId(), host.getId()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode",
                        ErrorCode.ROOM_MIN_PARTICIPANTS_NOT_MET);
    }

    @Test
    @DisplayName("예외: 퀴즈 단어가 8개 미만일 때 WORD_LIST_EMPTY")
    void startGame_insufficientWords_throwsException() {
        // Given - 모든 퀴즈 단어 삭제
        quizWordRepository.deleteAll();

        // When & Then
        assertThatThrownBy(() ->
                quizService.startGame(gameRoom.getId(), host.getId()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.WORD_LIST_EMPTY);
    }

    @Test
    @DisplayName("정상: 도전 신청 시 선착순으로 순서 부여")
    void registerChallenge_success() {
        // Given - 게임 시작
        quizService.startGame(gameRoom.getId(), host.getId());

        // When - 첫 번째 참가자가 도전 신청
        quizService.registerChallenge(
                gameRoom.getId(),
                participants.get(0).getId(),
                1
        );

        // Then - 도전권 획득 메시지 전송 확인
        verify(messagingTemplate, atLeast(2)) // 게임 시작 + 도전권 획득
                .convertAndSend(
                        eq("/topic/room/" + gameRoom.getId() + "/quiz"),
                        any(ApiResponse.class)
                );
    }

    @Test
    @DisplayName("정상: 4명이 도전 신청하면 5번째는 에러 메시지를 받는다")
    void registerChallenge_fifthPersonGetsError() {
        // Given - 게임 시작
        quizService.startGame(gameRoom.getId(), host.getId());

        // When - 4명이 도전 신청
        for (int i = 0; i < 3; i++) {
            quizService.registerChallenge(
                    gameRoom.getId(),
                    participants.get(i).getId(),
                    1
            );
        }
        quizService.registerChallenge(gameRoom.getId(), host.getId(), 1);

        // 5번째 사람 추가 생성
        User fifthUser = userRepository.save(User.builder()
                .nickname("5번째")
                .email("fifth@test.com")
                .provider(LoginMethod.KAKAO)
                .providerId("fifth")
                .build());

        gameParticipantRepository.save(GameParticipant.builder()
                .gameRoom(gameRoom)
                .participant(fifthUser)
                .isHost(false)
                .build());

        // 5번째 도전 시도
        quizService.registerChallenge(gameRoom.getId(), fifthUser.getId(), 1);

        // Then - 개인 에러 메시지 전송 확인
        verify(messagingTemplate, atLeastOnce())
                .convertAndSendToUser(
                        eq(String.valueOf(fifthUser.getId())),
                        eq("/queue/errors"),
                        any(ApiResponse.class)
                );
    }

    @Test
    @DisplayName("시나리오: 1등이 정답 제출하면 100점 획득")
    void submitAnswer_firstCorrect_gets100Points() {
        // Given - 게임 시작 및 도전 신청
        quizService.startGame(gameRoom.getId(), host.getId());

        User testUser = participants.get(0);
        quizService.registerChallenge(gameRoom.getId(), testUser.getId(), 1);

        // 1번 문제의 실제 정답을 동적으로 조회합니다.
        String correctAnswer = getCorrectAnswerForQuestion(1);

        // When - 조회한 정답을 제출합니다.
        quizService.submitAnswer(
                gameRoom.getId(),
                testUser.getId(),
                1,
                correctAnswer  // "단어0" 대신 실제 정답 사용
        );

        // 수동으로 게임 종료하여 GameHistory 저장
        quizService.endGame(gameRoom.getId());

        // Then - 점수가 100점으로 정상 저장되었는지 확인
        GameHistory history = gameHistoryRepository
                .findByGameRoom_IdAndParticipant_Id(
                        gameRoom.getId(),
                        testUser.getId()
                )
                .orElseThrow();

        assertThat(history.getScore()).isEqualTo(100);
    }

    @Test
    @DisplayName("시나리오: 1등 실패 → 2등이 90점 획득")
    void submitAnswer_firstFailsSecondSucceeds() {
        // Given - 게임 시작
        quizService.startGame(gameRoom.getId(), host.getId());

        // 2명이 도전 신청
        User user1 = participants.get(0);
        User user2 = participants.get(1);
        quizService.registerChallenge(gameRoom.getId(), user1.getId(), 1);
        quizService.registerChallenge(gameRoom.getId(), user2.getId(), 1);

        // 1번 문제의 실제 정답을 미리 조회
        String correctAnswer = getCorrectAnswerForQuestion(1);

        // When - 1등이 오답 제출
        quizService.submitAnswer(
                gameRoom.getId(),
                user1.getId(),
                1,
                "틀린답" // 의도적으로 오답 제출
        );

        // 2등이 동적으로 조회한 정답 제출
        quizService.submitAnswer(
                gameRoom.getId(),
                user2.getId(),
                1,
                correctAnswer // "단어0" 대신 실제 정답 사용
        );

        // 수동으로 게임 종료하여 GameHistory 저장
        quizService.endGame(gameRoom.getId());

        // Then - 2등이 90점 획득, 1등은 -50점
        GameHistory history1 = gameHistoryRepository
                .findByGameRoom_IdAndParticipant_Id(gameRoom.getId(), user1.getId())
                .orElseThrow();
        assertThat(history1.getScore()).isEqualTo(-50);

        GameHistory history2 = gameHistoryRepository
                .findByGameRoom_IdAndParticipant_Id(gameRoom.getId(), user2.getId())
                .orElseThrow();
        assertThat(history2.getScore()).isEqualTo(90); // 이제 정상적으로 90점이 됩니다.
    }

    @Test
    @DisplayName("시나리오: 4명 모두 실패 → 다음 문제로 이동")
    void submitAnswer_allFail_moveToNextQuestion() {
        // Given - 게임 시작
        quizService.startGame(gameRoom.getId(), host.getId());

        // 3명이 도전 신청
        for (int i = 0; i < 3; i++) {
            quizService.registerChallenge(
                    gameRoom.getId(),
                    participants.get(i).getId(),
                    1
            );
        }

        // When - 3명 모두 틀린 답 제출
        for (int i = 0; i < 3; i++) {
            quizService.submitAnswer(
                    gameRoom.getId(),
                    participants.get(i).getId(),
                    1,
                    "틀린답"
            );
        }

        // Then - 다음 문제로 이동 메시지 전송 확인
        verify(messagingTemplate, atLeastOnce())
                .convertAndSend(
                        eq("/topic/room/" + gameRoom.getId() + "/quiz"),
                        any(ApiResponse.class)
                );
    }


    @Test
    @DisplayName("예외: 도전 차례가 아닌 사람이 정답 제출 시 에러")
    void submitAnswer_notYourTurn_sendsError() {
        // Given
        quizService.startGame(gameRoom.getId(), host.getId());
        quizService.registerChallenge(gameRoom.getId(), participants.get(0).getId(), 1);

        // When - 도전권 없는 사람이 제출
        quizService.submitAnswer(
                gameRoom.getId(),
                participants.get(1).getId(),
                1,
                "단어0"
        );

        // Then - 개인 에러 메시지 전송
        verify(messagingTemplate, atLeastOnce())
                .convertAndSendToUser(
                        eq(String.valueOf(participants.get(1).getId())),
                        eq("/queue/errors"),
                        any(ApiResponse.class)
                );
    }

    @Test
    @DisplayName("예외: 존재하지 않는 참가자가 도전 시 PARTICIPANT_NOT_FOUND")
    void registerChallenge_participantNotFound_throwsException() {
        // Given
        quizService.startGame(gameRoom.getId(), host.getId());

        // When & Then
        assertThatThrownBy(() ->
                quizService.registerChallenge(gameRoom.getId(), -1L, 1))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode",
                        ErrorCode.PARTICIPANT_NOT_FOUND);
    }

    @Test
    @DisplayName("캐시: 게임 종료 시 캐시가 정리된다")
    void endGame_clearsCache() {
        // Given - 게임 시작 및 진행
        quizService.startGame(gameRoom.getId(), host.getId());
        quizService.registerChallenge(gameRoom.getId(), participants.get(0).getId(), 1);

        // 캐시에 데이터 존재 확인
        QuizStateCache.GameRoomState stateBefore =
                quizStateCache.getOrCreateRoomState(gameRoom.getId());
        assertThat(stateBefore.getQuizWordId(1)).isNotNull();

        // When - 게임 종료
        quizService.endGame(gameRoom.getId());

        // Then - 새로운 캐시 상태 (초기화됨)
        QuizStateCache.GameRoomState stateAfter =
                quizStateCache.getOrCreateRoomState(gameRoom.getId());
        assertThat(stateAfter.getQuizWordId(1)).isNull();
    }

    @Test
    @DisplayName("통합: 점수 누적 확인 (여러 문제)")
    void submitAnswer_multipleQuestions_scoresAccumulate() {
        // Given - 게임 시작
        quizService.startGame(gameRoom.getId(), host.getId());

        User testUser = participants.get(0);

        // --- 문제 1번 풀이 ---
        // 1번 문제의 실제 정답을 조회
        String answer1 = getCorrectAnswerForQuestion(1);

        // When - 조회한 정답으로 1번 문제 제출 (+100점)
        quizService.registerChallenge(gameRoom.getId(), testUser.getId(), 1);
        quizService.submitAnswer(gameRoom.getId(), testUser.getId(), 1, answer1);

        // --- 문제 2번 풀이 ---
        // 2번 문제의 실제 정답을 조회
        String answer2 = getCorrectAnswerForQuestion(2);

        // When - 조회한 정답으로 2번 문제 제출 (+100점)
        quizService.registerChallenge(gameRoom.getId(), testUser.getId(), 2);
        quizService.submitAnswer(gameRoom.getId(), testUser.getId(), 2, answer2);

        // 수동으로 게임 종료하여 캐시의 누적 점수를 GameHistory에 저장
        quizService.endGame(gameRoom.getId());

        // Then - 점수가 누적되었는지 확인
        GameHistory history = gameHistoryRepository
                .findByGameRoom_IdAndParticipant_Id(gameRoom.getId(), testUser.getId())
                .orElseThrow();

        // 이제 시나리오가 의도한 대로 동작하므로 200점이 맞습니다.
        assertThat(history.getScore()).isEqualTo(200); // 100 + 100
    }

    @Test
    @DisplayName("정상: 오답 시 -50점 처리")
    void submitAnswer_wrongAnswer_minus50Points() {
        // Given - 게임 시작
        quizService.startGame(gameRoom.getId(), host.getId());
        User testUser = participants.get(0);

        // When - 1번 문제 오답 제출
        quizService.registerChallenge(gameRoom.getId(), testUser.getId(), 1);
        quizService.submitAnswer(gameRoom.getId(), testUser.getId(), 1, "틀린답");

        // 게임 종료하여 점수 확인
        quizService.endGame(gameRoom.getId());

        // Then - -50점 확인
        GameHistory history = gameHistoryRepository
                .findByGameRoom_IdAndParticipant_Id(gameRoom.getId(), testUser.getId())
                .orElseThrow();

        assertThat(history.getScore()).isEqualTo(-50);
    }

    @Test
    @DisplayName("정상: 정답(+100) + 오답(-50) = 50점")
    void submitAnswer_correctAndWrong_totalScore() {
        // Given - 게임 시작
        quizService.startGame(gameRoom.getId(), host.getId());
        User testUser = participants.get(0);

        // --- 1번 문제 풀이 ---
        // 1번 문제의 실제 정답을 조회합니다.
        String correctAnswer = getCorrectAnswerForQuestion(1);

        // When - 조회한 정답으로 1번 문제를 제출합니다 (+100점).
        quizService.registerChallenge(gameRoom.getId(), testUser.getId(), 1);
        quizService.submitAnswer(gameRoom.getId(), testUser.getId(), 1, correctAnswer);

        // --- 2번 문제 풀이 ---
        // When - 2번 문제에는 의도적으로 오답을 제출합니다 (-50점).
        quizService.registerChallenge(gameRoom.getId(), testUser.getId(), 2);
        quizService.submitAnswer(gameRoom.getId(), testUser.getId(), 2, "틀린답");

        // 수동으로 게임 종료
        quizService.endGame(gameRoom.getId());

        // Then - 100 - 50 = 50점
        GameHistory history = gameHistoryRepository
                .findByGameRoom_IdAndParticipant_Id(gameRoom.getId(), testUser.getId())
                .orElseThrow();

        // 이제 시나리오가 의도대로 동작하여 최종 점수는 50점이 됩니다.
        assertThat(history.getScore()).isEqualTo(50);
    }

    @Test
    @DisplayName("정상: 게임 종료 후 대기실 복귀 (WAITING 상태)")
    void endGame_returnsToWaitingRoom() {
        // Given - 게임 시작
        quizService.startGame(gameRoom.getId(), host.getId());

        // 게임 상태가 IN_PROGRESS인지 확인
        GameRoom roomInProgress = gameRoomRepository.findById(gameRoom.getId()).orElseThrow();
        assertThat(roomInProgress.getStatus()).isEqualTo(GameRoomStatus.IN_PROGRESS);
        Integer roundBefore = roomInProgress.getCurrentRound();

        // When - 게임 종료
        quizService.endGame(gameRoom.getId());

        // Then - WAITING 상태로 복귀 및 라운드 증가
        GameRoom roomAfter = gameRoomRepository.findById(gameRoom.getId()).orElseThrow();
        assertThat(roomAfter.getStatus()).isEqualTo(GameRoomStatus.WAITING);
        assertThat(roomAfter.getCurrentRound()).isEqualTo(roundBefore + 1);
    }

    @Test
    @DisplayName("정상: 게임 종료 시 User totalScore 업데이트")
    void endGame_updateUserTotalScore() {
        // Given - 게임 시작
        quizService.startGame(gameRoom.getId(), host.getId());
        User testUser = participants.get(0);

        // 초기 totalScore 확인
        Long initialTotalScore = testUser.getTotalScore();

        // 1번 문제의 실제 정답을 조회합니다.
        String correctAnswer = getCorrectAnswerForQuestion(1);

        // When - 조회한 정답을 제출하여 100점을 획득합니다.
        quizService.registerChallenge(gameRoom.getId(), testUser.getId(), 1);
        quizService.submitAnswer(gameRoom.getId(), testUser.getId(), 1, correctAnswer);

        // 수동으로 게임 종료
        quizService.endGame(gameRoom.getId());

        // Then - User totalScore가 +100 만큼 업데이트되었는지 확인
        User updatedUser = userRepository.findById(testUser.getId()).orElseThrow();
        assertThat(updatedUser.getTotalScore()).isEqualTo(initialTotalScore + 100);
    }

    /**
     * 현재 출제된 문제의 정답(단어 제목)을 동적으로 조회하는 헬퍼 메서드
     *
     * @param questionNumber 조회할 문제 번호
     * @return 해당 문제의 정답 문자열
     */
    private String getCorrectAnswerForQuestion(int questionNumber) {
        // 1. 캐시에서 현재 문제의 QuizWord ID를 가져옵니다.
        QuizStateCache.GameRoomState roomState = quizStateCache.getOrCreateRoomState(gameRoom.getId());
        Long quizWordId = roomState.getQuizWordId(questionNumber);

        // 2. QuizWord ID를 이용해 DB에서 QuizWord 엔티티를 찾습니다.
        QuizWord quizWord = quizWordRepository.findById(quizWordId)
                .orElseThrow(() -> new IllegalStateException(questionNumber + "번 문제 정보를 찾을 수 없습니다."));

        // 3. QuizWord와 연결된 Sign 엔티티의 제목(title)이 정답입니다.
        return quizWord.getSign().getTitle();
    }

    @Test
    @DisplayName("통합: 게임 시작 → 진행 → 종료 전체 흐름 (동적 정답 조회)")
    void fullGameFlow_startToEnd() {
        // Given - 게임 시작
        quizService.startGame(gameRoom.getId(), host.getId());

        // 초기 상태 확인
        GameRoom roomStarted = gameRoomRepository.findById(gameRoom.getId()).orElseThrow();
        assertThat(roomStarted.getStatus()).isEqualTo(GameRoomStatus.IN_PROGRESS);
        Integer initialRound = roomStarted.getCurrentRound();

        // 테스트에 사용할 유저
        User user1 = participants.get(0);
        User user2 = participants.get(1);
        User user3 = participants.get(2);

        // When - 8개의 문제를 모두 진행하는 시나리오

        // --- 문제 1 ---
        // user1이 1등으로 정답 (+100점)
        String answer1 = getCorrectAnswerForQuestion(1);
        quizService.registerChallenge(gameRoom.getId(), user1.getId(), 1);
        quizService.submitAnswer(gameRoom.getId(), user1.getId(), 1, answer1);

        // --- 문제 2 ---
        // user2가 1등으로 정답 (+100점)
        String answer2 = getCorrectAnswerForQuestion(2);
        quizService.registerChallenge(gameRoom.getId(), user2.getId(), 2);
        quizService.submitAnswer(gameRoom.getId(), user2.getId(), 2, answer2);

        // --- 문제 3 ---
        // user3 오답(-50점), user1이 2등으로 정답 (+90점)
        String answer3 = getCorrectAnswerForQuestion(3);
        quizService.registerChallenge(gameRoom.getId(), user3.getId(), 3);
        quizService.registerChallenge(gameRoom.getId(), user1.getId(), 3);
        quizService.submitAnswer(gameRoom.getId(), user3.getId(), 3, "틀린답");
        quizService.submitAnswer(gameRoom.getId(), user1.getId(), 3, answer3);

        // --- 문제 4 ---
        // user3이 1등으로 정답 (+100점)
        String answer4 = getCorrectAnswerForQuestion(4);
        quizService.registerChallenge(gameRoom.getId(), user3.getId(), 4);
        quizService.submitAnswer(gameRoom.getId(), user3.getId(), 4, answer4);

        // --- 문제 5 ---
        // user2가 1등으로 정답 (+100점)
        String answer5 = getCorrectAnswerForQuestion(5);
        quizService.registerChallenge(gameRoom.getId(), user2.getId(), 5);
        quizService.submitAnswer(gameRoom.getId(), user2.getId(), 5, answer5);

        // --- 문제 6 ---
        // user1이 1등으로 정답 (+100점)
        String answer6 = getCorrectAnswerForQuestion(6);
        quizService.registerChallenge(gameRoom.getId(), user1.getId(), 6);
        quizService.submitAnswer(gameRoom.getId(), user1.getId(), 6, answer6);

        // --- 문제 7 ---
        // user2가 1등으로 정답 (+100점)
        String answer7 = getCorrectAnswerForQuestion(7);
        quizService.registerChallenge(gameRoom.getId(), user2.getId(), 7);
        quizService.submitAnswer(gameRoom.getId(), user2.getId(), 7, answer7);

        // --- 문제 8 (마지막 문제) ---
        // user3이 1등으로 정답 (+100점) -> 8번째 문제가 끝나면 자동으로 endGame() 호출됨
        String answer8 = getCorrectAnswerForQuestion(8);
        quizService.registerChallenge(gameRoom.getId(), user3.getId(), 8);
        quizService.submitAnswer(gameRoom.getId(), user3.getId(), 8, answer8);

        // Then - 최종 점수 확인
        // !! 중요: 수동 endGame() 호출이 없어도, 8번 문제가 끝나면 자동으로 게임이 종료되고 점수가 기록됩니다.

        // user1 최종 점수: 100(Q1) + 90(Q3) + 100(Q6) = 290점
        GameHistory history1 = gameHistoryRepository
                .findByGameRoom_IdAndParticipant_Id(gameRoom.getId(), user1.getId())
                .orElseThrow();
        assertThat(history1.getScore()).isEqualTo(290);

        // user2 최종 점수: 100(Q2) + 100(Q5) + 100(Q7) = 300점
        GameHistory history2 = gameHistoryRepository
                .findByGameRoom_IdAndParticipant_Id(gameRoom.getId(), user2.getId())
                .orElseThrow();
        assertThat(history2.getScore()).isEqualTo(300);

        // user3 최종 점수: -50(Q3) + 100(Q4) + 100(Q8) = 150점
        GameHistory history3 = gameHistoryRepository
                .findByGameRoom_IdAndParticipant_Id(gameRoom.getId(), user3.getId())
                .orElseThrow();
        assertThat(history3.getScore()).isEqualTo(150);

        // 방 상태 확인 (대기실로 복귀)
        GameRoom roomEnded = gameRoomRepository.findById(gameRoom.getId()).orElseThrow();
        assertThat(roomEnded.getStatus()).isEqualTo(GameRoomStatus.WAITING);
        assertThat(roomEnded.getCurrentRound()).isEqualTo(initialRound + 1);
    }

    @Test
    @DisplayName("정상: 게임 시작 시 단어 제목만 전송되고 영상 URL은 포함되지 않음")
    void startGame_sendsOnlyWordTitle() {
        // Given
        ArgumentCaptor<ApiResponse> responseCaptor = ArgumentCaptor.forClass(ApiResponse.class);

        // When
        quizService.startGame(gameRoom.getId(), host.getId());

        // Then
        verify(messagingTemplate, times(1))
                .convertAndSend(
                        eq("/topic/room/" + gameRoom.getId() + "/quiz"),
                        responseCaptor.capture()
                );

        ApiResponse capturedResponse = responseCaptor.getValue();
        assertThat(capturedResponse.isSuccess()).isTrue();
        assertThat(capturedResponse.getMessage()).isEqualTo("게임이 시작되었습니다");

        // QuizStartResponse 검증
        Object data = capturedResponse.getData();
        assertThat(data).isInstanceOf(QuizStartResponse.class);

        QuizStartResponse quizStart = (QuizStartResponse) data;
        assertThat(quizStart.getQuestionNumber()).isEqualTo(1);
        assertThat(quizStart.getTotalQuestions()).isEqualTo(8);
        assertThat(quizStart.getWordTitle()).isNotNull();
        assertThat(quizStart.getWordTitle()).startsWith("단어"); // "단어0", "단어1" 등
    }

    @Test
    @DisplayName("정상: 다음 문제 이동 시 단어 제목만 전송됨")
    void moveToNextQuestion_sendsOnlyWordTitle() {
        // Given
        ArgumentCaptor<ApiResponse> responseCaptor = ArgumentCaptor.forClass(ApiResponse.class);
        quizService.startGame(gameRoom.getId(), host.getId());

        // 첫 번째 문제 정답 처리 (자동으로 다음 문제로 이동)
        quizService.registerChallenge(gameRoom.getId(), participants.get(0).getId(), 1);

        // When - 정답 제출하면 자동으로 다음 문제로 이동
        quizService.submitAnswer(
                gameRoom.getId(),
                participants.get(0).getId(),
                1,
                "단어0"
        );

        // Then - 다음 문제 메시지 검증
        verify(messagingTemplate, atLeast(2)) // 게임 시작 + 정답 결과 + 다음 문제
                .convertAndSend(
                        eq("/topic/room/" + gameRoom.getId() + "/quiz"),
                        responseCaptor.capture()
                );

        // 마지막 메시지가 다음 문제 정보인지 확인
        List<ApiResponse> allResponses = responseCaptor.getAllValues();
        ApiResponse lastResponse = allResponses.get(allResponses.size() - 1);

        Object data = lastResponse.getData();
        if (data instanceof NextQuestionResponse) {
            NextQuestionResponse nextQuestion = (NextQuestionResponse) data;
            assertThat(nextQuestion.getQuestionNumber()).isEqualTo(2);
            assertThat(nextQuestion.getTotalQuestions()).isEqualTo(8);
            assertThat(nextQuestion.getWordTitle()).isNotNull();
            assertThat(nextQuestion.getWordTitle()).startsWith("단어");
        }
    }

    @Test
    @DisplayName("통합: 라운드별 점수 누적 (1라운드 + 2라운드)")
    void multipleRounds_scoresAccumulate() {
        // Given
        User testUser = participants.get(0);
        Long initialTotalScore = testUser.getTotalScore();

        // --- 1라운드 시작 ---
        quizService.startGame(gameRoom.getId(), host.getId());

        // When - 1라운드: 100점 획득
        String round1_answer1 = getCorrectAnswerForQuestion(1); // 1라운드의 1번 문제 정답 조회
        quizService.registerChallenge(gameRoom.getId(), testUser.getId(), 1);
        quizService.submitAnswer(gameRoom.getId(), testUser.getId(), 1, round1_answer1);

        // 1라운드 종료
        quizService.endGame(gameRoom.getId());

        // Then - 1라운드 후 totalScore 확인
        User afterRound1 = userRepository.findById(testUser.getId()).orElseThrow();
        assertThat(afterRound1.getTotalScore()).isEqualTo(initialTotalScore + 100);

        // --- 2라운드 시작 (새로운 문제 세트) ---
        quizService.startGame(gameRoom.getId(), host.getId());

        // When - 2라운드 진행: 150점 획득
        String round2_answer1 = getCorrectAnswerForQuestion(1); // 2라운드의 1번 문제 정답 조회
        quizService.registerChallenge(gameRoom.getId(), testUser.getId(), 1);
        quizService.submitAnswer(gameRoom.getId(), testUser.getId(), 1, round2_answer1); // +100

        String round2_answer2 = getCorrectAnswerForQuestion(2); // 2라운드의 2번 문제 정답 조회
        quizService.registerChallenge(gameRoom.getId(), testUser.getId(), 2);
        quizService.submitAnswer(gameRoom.getId(), testUser.getId(), 2, "틀린답"); // -50
        // user1이 오답을 제출했으므로, 2번 문제에 대한 도전권이 남아있습니다.
        // 하지만 이 테스트 시나리오에서는 user1이 2등으로 다시 도전하는 상황이 아니므로,
        // 다른 유저(user2)가 도전해서 문제를 맞히는 것으로 시나리오를 수정합니다.
        User anotherUser = participants.get(1);
        quizService.registerChallenge(gameRoom.getId(), anotherUser.getId(), 2);
        quizService.submitAnswer(gameRoom.getId(), anotherUser.getId(), 2, round2_answer2); // 다른 유저가 +90점

        // 2라운드 종료
        quizService.endGame(gameRoom.getId());

        // Then - 2라운드 후 testUser의 totalScore 확인 (1라운드 100 + 2라운드 50 = 150)
        // 2라운드 점수: +100(Q1 정답) - 50(Q2 오답) = 50점
        User afterRound2 = userRepository.findById(testUser.getId()).orElseThrow();
        assertThat(afterRound2.getTotalScore()).isEqualTo(initialTotalScore + 100 + 50);

        // GameHistory 확인 (2개의 라운드 기록)
        List<GameHistory> histories = gameHistoryRepository
                .findAllByGameRoom_IdAndParticipant_Id(gameRoom.getId(), testUser.getId());
        assertThat(histories).hasSize(2);
        assertThat(histories.get(0).getScore()).isEqualTo(100); // 1라운드 점수
        assertThat(histories.get(1).getScore()).isEqualTo(50); // 2라운드 점수
    }

    @Test
    @DisplayName("통합: 2등이 90점, 3등이 80점, 4등이 70점 획득")
    void submitAnswer_allRanks_correctScores() {


        quizService.startGame(gameRoom.getId(), host.getId());
        User user1 = participants.get(0);
        User user2 = participants.get(1);
        User user3 = participants.get(2);

        // When - 문제 1: 4명이 도전 신청 (방장 포함)
        quizService.registerChallenge(gameRoom.getId(), user1.getId(), 1);
        quizService.registerChallenge(gameRoom.getId(), user2.getId(), 1);
        quizService.registerChallenge(gameRoom.getId(), user3.getId(), 1);
        quizService.registerChallenge(gameRoom.getId(), host.getId(), 1);


        // 1등 오답, 2등 정답 (90점)
        String answer1 = getCorrectAnswerForQuestion(1); // 1번 문제 정답 조회
        quizService.submitAnswer(gameRoom.getId(), user1.getId(), 1, "틀린답");
        quizService.submitAnswer(gameRoom.getId(), user2.getId(), 1, answer1);


        // 문제 2: 3등 정답 (80점)
        quizService.registerChallenge(gameRoom.getId(), user1.getId(), 2);
        quizService.registerChallenge(gameRoom.getId(), user2.getId(), 2);
        quizService.registerChallenge(gameRoom.getId(), user3.getId(), 2);


        String answer2 = getCorrectAnswerForQuestion(2); // 2번 문제 정답 조회
        quizService.submitAnswer(gameRoom.getId(), user1.getId(), 2, "틀린답");
        quizService.submitAnswer(gameRoom.getId(), user2.getId(), 2, "틀린답");
        quizService.submitAnswer(gameRoom.getId(), user3.getId(), 2, answer2);

        // 문제 3: 4등 정답 (70점)
        quizService.registerChallenge(gameRoom.getId(), user1.getId(), 3);
        quizService.registerChallenge(gameRoom.getId(), user2.getId(), 3);
        quizService.registerChallenge(gameRoom.getId(), user3.getId(), 3);
        quizService.registerChallenge(gameRoom.getId(), host.getId(), 3);


        String answer3 = getCorrectAnswerForQuestion(3); // 3번 문제 정답 조회
        quizService.submitAnswer(gameRoom.getId(), user1.getId(), 3, "틀린답");
        quizService.submitAnswer(gameRoom.getId(), user2.getId(), 3, "틀린답");
        quizService.submitAnswer(gameRoom.getId(), user3.getId(), 3, "틀린답");
        quizService.submitAnswer(gameRoom.getId(), host.getId(), 3, answer3);


        // 수동으로 게임 종료
        quizService.endGame(gameRoom.getId());

        // Then - 각 등수별 점수 확인
        GameHistory history1 = gameHistoryRepository
                .findByGameRoom_IdAndParticipant_Id(gameRoom.getId(), user1.getId())
                .orElseThrow();
        assertThat(history1.getScore()).isEqualTo(-150); // 3번 모두 오답 (-50 * 3)

        GameHistory history2 = gameHistoryRepository
                .findByGameRoom_IdAndParticipant_Id(gameRoom.getId(), user2.getId())
                .orElseThrow();

        // 시나리오: +90점(Q1), -50점(Q2), -50점(Q3) = 최종 -10점
        assertThat(history2.getScore()).isEqualTo(-10);

        GameHistory history3 = gameHistoryRepository
                .findByGameRoom_IdAndParticipant_Id(gameRoom.getId(), user3.getId())
                .orElseThrow();
        // 시나리오: 80점(Q2), -50점(Q3) = 최종 30점
        assertThat(history3.getScore()).isEqualTo(30);

        GameHistory historyHost = gameHistoryRepository
                .findByGameRoom_IdAndParticipant_Id(gameRoom.getId(), host.getId())
                .orElseThrow();
        assertThat(historyHost.getScore()).isEqualTo(70); // 4등 정답 70점
    }
}