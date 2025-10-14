package app.signbell.backend.repository;

import app.signbell.backend.entity.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.AssertionsForClassTypes.assertThat;

/**
 * GameParticipantRepositoryTest 클래스는 GameParticipantRepository 및 관련된 Repository의 기능을 테스트하기 위한 테스트 클래스입니다.
 * 각각의 테스트 메서드는 주요 비즈니스 로직과 다양한 시나리오를 검증하는 역할을 수행합니다.
 *
 * 테스트 대상 시나리오:
 * 1. 사용자가 방을 생성한 후 중복 방 생성을 시도할 때의 동작.
 * 2. 게임이 완료된 후 사용자가 새로운 방을 생성할 수 있는지 여부.
 * 3. 참가자가 대기 중인 방에 있을 때 중복 방 생성 불가 여부 검증.
 * 4. 게임이 진행 중일 때 새로운 방 생성이 차단되는지 확인.
 * 5. 여러 사용자가 독립적으로 방을 생성할 수 있는지 확인.
 * 6. 많은 방이 존재할 때도 관련 데이터 조회 성능이 유지되는지 검증.
 * 7. 경계값 조건(예: null 사용자로 조회 시)의 올바른 작동 여부 검토.
 *
 * 사용된 어노테이션:
 * - {@link SpringBootTest}: Spring Boot 통합 테스트 설정.
 * - {@link Transactional}: 각 테스트 메서드가 독립적으로 데이터베이스에 영향을 미치지 않도록 트랜잭션 롤백 보장.
 * - {@link DisplayName}: 테스트 메서드에 대한 설명을 제공하여 가독성을 높임.
 *
 * 주석을 통해 각 테스트 메서드의 조건(입력 값), 수행 동작, 예상 결과에 따른 비즈니스 로직을 명확히 설명합니다.
 *
 * 주요 테스트 메서드:
 * - {@code realScenario_UserCreatesRoomThenTriesAgain}: 동일 사용자가 중복 방 생성 시도를 처리하는 케이스.
 * - {@code realScenario_UserCompletesGameThenCreatesNewRoom}: 게임 완료 후 새로운 방 생성 가능 여부를 검증.
 * - {@code realScenario_ParticipantInWaitingRoom}: 대기 중인 방에 있는 사용자의 제한 조건 검증.
 * - {@code realScenario_GameInProgressCannotCreateNewRoom}: 게임 진행 중인 방에서 새로운 방 생성 제한 검토.
 * - {@code realScenario_MultipleUsersCreateRoomsIndependently}: 사용자가 독립적으로 방을 생성할 수 있는 방식 검증.
 * - {@code performanceTest_ManyRoomsExist}: 대규모 데이터 환경에서 성능 유지 여부 확인.
 * - {@code boundaryTest_NullUser}: null 입력에 대한 경계 테스트.
 *
 * @author 강관주
 * @since 2025-10-14
 */
@SpringBootTest
@Transactional
@DisplayName("GameParticipantRepository 테스트")
public class GameParticipantRepositoryTest {

    @Autowired
    private GameParticipantRepository gameParticipantRepository;

    @Autowired
    private GameRoomRepository gameRoomRepository;

    @Autowired
    private UserRepository userRepository;

    private User testUser;
    private User otherUser;

    @BeforeEach
    void setUp() {
        testUser = userRepository.save(User.builder()
                .nickname("testUser")
                .email("test@example.com")
                .provider(LoginMethod.KAKAO)
                .providerId("123")
                .build());

        otherUser = userRepository.save(User.builder()
                .nickname("otherUser")
                .email("other@example.com")
                .provider(LoginMethod.KAKAO)
                .providerId("456")
                .build());
    }

    @Test
    @DisplayName("실제 시나리오: 사용자가 방을 생성한 후 중복 생성을 시도할 때")
    void realScenario_UserCreatesRoomThenTriesAgain() {
        // Given - 사용자가 첫 번째 방 생성
        GameRoom firstRoom = gameRoomRepository.save(GameRoom.builder()
                .gameTitle("첫 번째 방")
                .host(testUser)
                .status(GameRoomStatus.WAITING)
                .build());

        gameParticipantRepository.save(GameParticipant.builder()
                .gameRoom(firstRoom)
                .participant(testUser)
                .isHost(true)
                .build());

        // When - 두 번째 방 생성 전 체크
        boolean alreadyInRoom = gameParticipantRepository
                .existsByParticipantAndGameRoom_StatusIn(
                        testUser,
                        GameRoomStatus.WAITING,
                        GameRoomStatus.IN_PROGRESS
                );

        // Then
        assertThat(alreadyInRoom).isTrue(); // 이미 참여 중이므로 방 생성 불가
    }

    @Test
    @DisplayName("실제 시나리오: 게임이 완료된 후 새로운 방을 생성할 때")
    void realScenario_UserCompletesGameThenCreatesNewRoom() {
        // Given - 사용자가 게임을 완료함
        GameRoom completedRoom = gameRoomRepository.save(GameRoom.builder()
                .gameTitle("완료된 방")
                .host(testUser)
                .status(GameRoomStatus.FINISHED)
                .build());

        gameParticipantRepository.save(GameParticipant.builder()
                .gameRoom(completedRoom)
                .participant(testUser)
                .isHost(true)
                .build());

        // When - 새로운 방 생성 전 체크
        boolean alreadyInRoom = gameParticipantRepository
                .existsByParticipantAndGameRoom_StatusIn(
                        testUser,
                        GameRoomStatus.WAITING,
                        GameRoomStatus.IN_PROGRESS
                );

        // Then
        assertThat(alreadyInRoom).isFalse(); // 완료된 방은 제외되므로 새 방 생성 가능
    }

    @Test
    @DisplayName("실제 시나리오: 참가자가 대기 중인 방에 있을 때")
    void realScenario_ParticipantInWaitingRoom() {
        // Given - 방장이 방을 만들고, 다른 사용자가 참가
        GameRoom room = gameRoomRepository.save(GameRoom.builder()
                .gameTitle("대기 방")
                .host(otherUser)
                .status(GameRoomStatus.WAITING)
                .build());

        gameParticipantRepository.save(GameParticipant.builder()
                .gameRoom(room)
                .participant(otherUser)
                .isHost(true)
                .build());

        gameParticipantRepository.save(GameParticipant.builder()
                .gameRoom(room)
                .participant(testUser)
                .isHost(false)
                .build());

        // When - testUser가 새로운 방을 만들려고 할 때
        boolean alreadyInRoom = gameParticipantRepository
                .existsByParticipantAndGameRoom_StatusIn(
                        testUser,
                        GameRoomStatus.WAITING,
                        GameRoomStatus.IN_PROGRESS
                );

        // Then
        assertThat(alreadyInRoom).isTrue(); // 일반 참가자도 중복 방 생성 불가
    }

    @Test
    @DisplayName("실제 시나리오: 게임이 진행 중일 때 새로운 방 생성 시도")
    void realScenario_GameInProgressCannotCreateNewRoom() {
        // Given - 게임이 시작되어 IN_PROGRESS 상태
        GameRoom inProgressRoom = gameRoomRepository.save(GameRoom.builder()
                .gameTitle("진행 중인 방")
                .host(testUser)
                .status(GameRoomStatus.IN_PROGRESS)
                .build());

        gameParticipantRepository.save(GameParticipant.builder()
                .gameRoom(inProgressRoom)
                .participant(testUser)
                .isHost(true)
                .build());

        // When - 새로운 방 생성 전 체크
        boolean alreadyInRoom = gameParticipantRepository
                .existsByParticipantAndGameRoom_StatusIn(
                        testUser,
                        GameRoomStatus.WAITING,
                        GameRoomStatus.IN_PROGRESS
                );

        // Then
        assertThat(alreadyInRoom).isTrue(); // 게임 진행 중에도 방 생성 불가
    }

    @Test
    @DisplayName("실제 시나리오: 여러 사용자가 독립적으로 방을 생성")
    void realScenario_MultipleUsersCreateRoomsIndependently() {
        // Given - testUser가 방 생성
        GameRoom userRoom = gameRoomRepository.save(GameRoom.builder()
                .gameTitle("testUser의 방")
                .host(testUser)
                .status(GameRoomStatus.WAITING)
                .build());

        gameParticipantRepository.save(GameParticipant.builder()
                .gameRoom(userRoom)
                .participant(testUser)
                .isHost(true)
                .build());

        // When - otherUser가 방 생성 가능한지 체크
        boolean otherUserAlreadyInRoom = gameParticipantRepository
                .existsByParticipantAndGameRoom_StatusIn(
                        otherUser,
                        GameRoomStatus.WAITING,
                        GameRoomStatus.IN_PROGRESS
                );

        // Then
        assertThat(otherUserAlreadyInRoom).isFalse(); // 다른 사용자는 방 생성 가능
    }

    @Test
    @DisplayName("성능 테스트: 많은 방이 있을 때도 빠르게 조회되어야 한다")
    void performanceTest_ManyRoomsExist() {
        // Given - 100개의 완료된 방 생성
        for (int i = 0; i < 100; i++) {
            GameRoom room = gameRoomRepository.save(GameRoom.builder()
                    .gameTitle("완료된 방 " + i)
                    .host(otherUser)
                    .status(GameRoomStatus.FINISHED)
                    .build());

            gameParticipantRepository.save(GameParticipant.builder()
                    .gameRoom(room)
                    .participant(otherUser)
                    .isHost(true)
                    .build());
        }

        // 1개의 대기 중인 방
        GameRoom waitingRoom = gameRoomRepository.save(GameRoom.builder()
                .gameTitle("대기 방")
                .host(testUser)
                .status(GameRoomStatus.WAITING)
                .build());

        gameParticipantRepository.save(GameParticipant.builder()
                .gameRoom(waitingRoom)
                .participant(testUser)
                .isHost(true)
                .build());

        // When
        long startTime = System.currentTimeMillis();
        boolean exists = gameParticipantRepository
                .existsByParticipantAndGameRoom_StatusIn(
                        testUser,
                        GameRoomStatus.WAITING,
                        GameRoomStatus.IN_PROGRESS
                );
        long endTime = System.currentTimeMillis();

        // Then
        assertThat(exists).isTrue();
        assertThat(endTime - startTime).isLessThan(100); // 100ms 이내 응답
    }

    @Test
    @DisplayName("경계값 테스트: null 사용자로 조회 시 false 반환")
    void boundaryTest_NullUser() {
        // When
        boolean exists = gameParticipantRepository
                .existsByParticipantAndGameRoom_StatusIn(
                        null,
                        GameRoomStatus.WAITING,
                        GameRoomStatus.IN_PROGRESS
                );

        // Then
        assertThat(exists).isFalse();
    }
}
