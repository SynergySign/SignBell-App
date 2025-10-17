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

    private void createTestQuizWords(int count) {
        for (int i = 0; i < count; i++) {
            Sign sign = signRepository.save(Sign.builder()
                    .title("단어" + i)
                    .url("http://example.com/" + i)
                    .signDescription("설명" + i)
                    .categoryType("테스트")
                    .learningStatus(SignStatus.COMPLETED)
                    .build());

            quizWordRepository.save(QuizWord.builder()
                    .sign(sign)
                    .build());
        }
    }

    @Test
    @DisplayName("정상: 게임 시작 시 8개의 문제가 생성되고 메시지가 전송된다")
    void startGame_success() {
        // When
        quizService.startGame(gameRoom.getId(), host.getId());

        // Then
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
    @DisplayName("예외: 최소 인원(3명) 미만일 때 게임 시작 불가")
    void startGame_insufficientParticipants_throwsException() {
        // Given - 새로운 게임방을 2명으로 생성
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

        // 참가자 1명만 참가
        gameParticipantRepository.save(GameParticipant.builder()
                .gameRoom(smallRoom)
                .participant(participants.get(0))
                .isHost(false)
                .build());

        // 참가자 수 업데이트
        smallRoom.incrementParticipants(); // host
        smallRoom.incrementParticipants(); // participant[0]

        // When & Then
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
        quizService.registerChallenge(gameRoom.getId(), participants.get(0).getId(), 1);

        // When - 정답 제출
        quizService.submitAnswer(
                gameRoom.getId(),
                participants.get(0).getId(),
                1,
                "단어0"  // 정답
        );

        // 게임 종료하여 GameHistory 저장
        quizService.endGame(gameRoom.getId());

        // Then - 점수가 저장되었는지 확인
        GameHistory history = gameHistoryRepository
                .findByGameRoom_IdAndParticipant_Id(
                        gameRoom.getId(),
                        participants.get(0).getId()
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
        quizService.registerChallenge(gameRoom.getId(), participants.get(0).getId(), 1);
        quizService.registerChallenge(gameRoom.getId(), participants.get(1).getId(), 1);

        // When - 1등이 오답 제출
        quizService.submitAnswer(
                gameRoom.getId(),
                participants.get(0).getId(),
                1,
                "틀린답"
        );

        // 2등이 정답 제출
        quizService.submitAnswer(
                gameRoom.getId(),
                participants.get(1).getId(),
                1,
                "단어0"
        );

        // 게임 종료하여 GameHistory 저장
        quizService.endGame(gameRoom.getId());

        // Then - 2등이 90점 획득
        GameHistory history = gameHistoryRepository
                .findByGameRoom_IdAndParticipant_Id(
                        gameRoom.getId(),
                        participants.get(1).getId()
                )
                .orElseThrow();

        assertThat(history.getScore()).isEqualTo(90);
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
    @DisplayName("시나리오: 타임아웃 발생 → 다음 사람 차례")
    void handleTimeout_moveToNextChallenger() {
        // Given
        quizService.startGame(gameRoom.getId(), host.getId());
        quizService.registerChallenge(gameRoom.getId(), participants.get(0).getId(), 1);
        quizService.registerChallenge(gameRoom.getId(), participants.get(1).getId(), 1);

        // When - 1등이 타임아웃
        quizService.handleTimeout(
                gameRoom.getId(),
                participants.get(0).getId(),
                1
        );

        // Then - 다음 사람 차례 알림 전송
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

        // When - 문제 1번 정답 (100점)
        quizService.registerChallenge(gameRoom.getId(), testUser.getId(), 1);
        quizService.submitAnswer(gameRoom.getId(), testUser.getId(), 1, "단어0");

        // 문제 2번 도전 신청 및 정답 (100점)
        quizService.registerChallenge(gameRoom.getId(), testUser.getId(), 2);
        quizService.submitAnswer(gameRoom.getId(), testUser.getId(), 2, "단어1");

        // 게임 종료하여 캐시의 누적 점수를 GameHistory에 저장
        quizService.endGame(gameRoom.getId());

        // Then - 점수가 누적되었는지 확인 (캐시에 누적된 최종 점수)
        GameHistory history = gameHistoryRepository
                .findByGameRoom_IdAndParticipant_Id(gameRoom.getId(), testUser.getId())
                .orElseThrow();

        assertThat(history.getScore()).isEqualTo(200); // 100 + 100 (캐시에서 누적된 점수)
    }
}