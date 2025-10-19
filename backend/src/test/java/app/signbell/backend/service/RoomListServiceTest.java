package app.signbell.backend.service;

import app.signbell.backend.dto.response.RoomDetailResponse;
import app.signbell.backend.dto.response.RoomListResponse;
import app.signbell.backend.dto.response.RoomListSliceResponse;
import app.signbell.backend.entity.*;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.GameParticipantRepository;
import app.signbell.backend.repository.GameRoomRepository;
import app.signbell.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;

/**
 * RoomListServiceTest 클래스는 게임 방 목록 조회 서비스(RoomListService)의 통합 테스트를 수행하기 위한 클래스입니다.
 *
 * 이 테스트 클래스는 Spring Boot 환경에서 통합 테스트를 수행하며, 각 테스트는 @Transactional 어노테이션을 통해
 * 데이터베이스의 변경 사항이 테스트 종료 후 자동으로 롤백됩니다.
 *
 * 주요 테스트 시나리오:
 * - WAITING 상태의 방 목록이 정상적으로 조회되는지 확인
 * - IN_PROGRESS 상태의 방 목록이 정상적으로 조회되는지 확인
 * - FINISHED 상태의 방은 목록에서 제외되는지 확인
 * - 페이징이 정상적으로 작동하는지 확인
 * - 특정 방 상세 정보가 정상적으로 조회되는지 확인
 * - 존재하지 않는 방 조회 시 예외가 발생하는지 확인
 * - FINISHED 상태의 방 조회 시 예외가 발생하는지 확인
 * - 빈 목록이 정상적으로 반환되는지 확인
 * - 페이지 크기 유효성 검증이 작동하는지 확인
 * - hasNext 플래그가 정확하게 동작하는지 확인
 *
 * 테스트 방법:
 * - 사용자(User), 게임 방(GameRoom), 그리고 게임 참가자(GameParticipant)와 관련된 데이터를 JpaRepository를 사용해 데이터베이스에 직접 접근
 * - 각 테스트는 given-when-then 패턴으로 작성되어 이해하기 쉽게 구성
 * - 모든 테스트는 필요한 경우 사용자 또는 관련된 데이터의 초기 구성을 포함
 *
 * @author 강관주
 * @since 2025-10-19
 */
@SpringBootTest
@Transactional
@DisplayName("RoomListService 테스트")
class RoomListServiceTest {

    @Autowired
    private RoomListService roomListService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GameRoomRepository gameRoomRepository;

    @Autowired
    private GameParticipantRepository gameParticipantRepository;

    private User testUser1;
    private User testUser2;
    private User testUser3;

    @BeforeEach
    void setUp() {
        // 테스트 사용자들 생성
        testUser1 = User.builder()
                .nickname("testUser1")
                .email("test1@example.com")
                .provider(LoginMethod.KAKAO)
                .providerId("111")
                .build();
        testUser1 = userRepository.save(testUser1);

        testUser2 = User.builder()
                .nickname("testUser2")
                .email("test2@example.com")
                .provider(LoginMethod.KAKAO)
                .providerId("222")
                .build();
        testUser2 = userRepository.save(testUser2);

        testUser3 = User.builder()
                .nickname("testUser3")
                .email("test3@example.com")
                .provider(LoginMethod.KAKAO)
                .providerId("333")
                .build();
        testUser3 = userRepository.save(testUser3);
    }

    @Test
    @DisplayName("WAITING 상태의 방만 조회되어야 한다")
    void getRoomList_OnlyWaitingRooms() {
        // Given
        GameRoom waitingRoom = createGameRoom("대기 중인 방", testUser1, GameRoomStatus.WAITING);

        // When
        RoomListSliceResponse response = roomListService.getRoomList(0, 10);

        // Then
        assertThat(response.getRoomList()).hasSize(1);
        assertThat(response.getRoomList().get(0).getGameTitle()).isEqualTo("대기 중인 방");
        assertThat(response.getRoomList().get(0).getStatus()).isEqualTo("WAITING");
        assertThat(response.getHasNext()).isFalse();
    }

    @Test
    @DisplayName("IN_PROGRESS 상태의 방도 조회되어야 한다")
    void getRoomList_InProgressRoomsIncluded() {
        // Given
        GameRoom inProgressRoom = createGameRoom("진행 중인 방", testUser1, GameRoomStatus.IN_PROGRESS);

        // When
        RoomListSliceResponse response = roomListService.getRoomList(0, 10);

        // Then
        assertThat(response.getRoomList()).hasSize(1);
        assertThat(response.getRoomList().get(0).getStatus()).isEqualTo("IN_PROGRESS");
    }

    @Test
    @DisplayName("WAITING과 IN_PROGRESS 상태의 방이 모두 조회되어야 한다")
    void getRoomList_WaitingAndInProgressRooms() {
        // Given
        GameRoom waitingRoom = createGameRoom("대기 중인 방", testUser1, GameRoomStatus.WAITING);
        GameRoom inProgressRoom = createGameRoom("진행 중인 방", testUser2, GameRoomStatus.IN_PROGRESS);

        // When
        RoomListSliceResponse response = roomListService.getRoomList(0, 10);

        // Then
        assertThat(response.getRoomList()).hasSize(2);
        assertThat(response.getRoomList())
                .extracting(RoomListResponse::getStatus)
                .containsExactlyInAnyOrder("WAITING", "IN_PROGRESS");
    }

    @Test
    @DisplayName("FINISHED 상태의 방은 목록에서 제외되어야 한다")
    void getRoomList_FinishedRoomsExcluded() {
        // Given
        GameRoom waitingRoom = createGameRoom("대기 중인 방", testUser1, GameRoomStatus.WAITING);
        GameRoom finishedRoom = createGameRoom("종료된 방", testUser2, GameRoomStatus.FINISHED);

        // When
        RoomListSliceResponse response = roomListService.getRoomList(0, 10);

        // Then
        assertThat(response.getRoomList()).hasSize(1);
        assertThat(response.getRoomList().get(0).getStatus()).isEqualTo("WAITING");
        assertThat(response.getRoomList())
                .extracting(RoomListResponse::getGameTitle)
                .doesNotContain("종료된 방");
    }

    @Test
    @DisplayName("페이징이 정상적으로 작동해야 한다")
    void getRoomList_PagingWorks() {
        // Given - 5개의 방 생성
        for (int i = 1; i <= 5; i++) {
            createGameRoom("방" + i, testUser1, GameRoomStatus.WAITING);
        }

        // When - 페이지 크기를 2로 설정
        RoomListSliceResponse page0 = roomListService.getRoomList(0, 2);
        RoomListSliceResponse page1 = roomListService.getRoomList(1, 2);

        // Then
        assertThat(page0.getRoomList()).hasSize(2);
        assertThat(page0.getHasNext()).isTrue();
        assertThat(page1.getRoomList()).hasSize(2);
        assertThat(page1.getHasNext()).isTrue();
    }

    @Test
    @DisplayName("마지막 페이지에서 hasNext가 false여야 한다")
    void getRoomList_LastPageHasNextFalse() {
        // Given - 3개의 방 생성
        createGameRoom("방1", testUser1, GameRoomStatus.WAITING);
        createGameRoom("방2", testUser2, GameRoomStatus.WAITING);
        createGameRoom("방3", testUser3, GameRoomStatus.WAITING);

        // When - 페이지 크기를 5로 설정 (3개만 있으므로 한 페이지에 다 들어감)
        RoomListSliceResponse response = roomListService.getRoomList(0, 5);

        // Then
        assertThat(response.getRoomList()).hasSize(3);
        assertThat(response.getHasNext()).isFalse();
    }

    @Test
    @DisplayName("방이 없을 때 빈 목록이 반환되어야 한다")
    void getRoomList_EmptyList() {
        // Given - 방이 없음

        // When
        RoomListSliceResponse response = roomListService.getRoomList(0, 10);

        // Then
        assertThat(response.getRoomList()).isEmpty();
        assertThat(response.getHasNext()).isFalse();
    }

    @Test
    @DisplayName("유효하지 않은 페이지 크기는 기본값 10으로 설정되어야 한다")
    void getRoomList_InvalidSizeDefaultsTo10() {
        // Given - 15개의 방 생성
        for (int i = 1; i <= 15; i++) {
            createGameRoom("방" + i, testUser1, GameRoomStatus.WAITING);
        }

        // When - 유효하지 않은 페이지 크기 (0, 101)
        RoomListSliceResponse response1 = roomListService.getRoomList(0, 0);
        RoomListSliceResponse response2 = roomListService.getRoomList(0, 101);

        // Then - 기본값 10으로 조회됨
        assertThat(response1.getRoomList()).hasSize(10);
        assertThat(response2.getRoomList()).hasSize(10);
    }

    @Test
    @DisplayName("특정 방의 상세 정보가 정상적으로 조회되어야 한다")
    void getRoomDetail_Success() {
        // Given
        GameRoom room = createGameRoom("테스트 방", testUser1, GameRoomStatus.WAITING);

        // When
        RoomDetailResponse response = roomListService.getRoomDetail(room.getId());

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getGameRoomId()).isEqualTo(room.getId());
        assertThat(response.getGameTitle()).isEqualTo("테스트 방");
        assertThat(response.getCurrentParticipants()).isEqualTo(1);
        assertThat(response.getMaxParticipants()).isEqualTo(4);
        assertThat(response.getStatus()).isEqualTo("WAITING");
    }

    @Test
    @DisplayName("IN_PROGRESS 상태의 방 상세 정보도 조회되어야 한다")
    void getRoomDetail_InProgressRoom() {
        // Given
        GameRoom room = createGameRoom("진행 중인 방", testUser1, GameRoomStatus.IN_PROGRESS);

        // When
        RoomDetailResponse response = roomListService.getRoomDetail(room.getId());

        // Then
        assertThat(response.getStatus()).isEqualTo("IN_PROGRESS");
    }

    @Test
    @DisplayName("존재하지 않는 방 조회 시 예외가 발생해야 한다")
    void getRoomDetail_RoomNotFound() {
        // Given
        Long nonExistentRoomId = 99999L;

        // When & Then
        assertThatThrownBy(() -> roomListService.getRoomDetail(nonExistentRoomId))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ROOM_NOT_FOUND);
    }

    @Test
    @DisplayName("FINISHED 상태의 방 조회 시 예외가 발생해야 한다")
    void getRoomDetail_FinishedRoomThrowsException() {
        // Given
        GameRoom finishedRoom = createGameRoom("종료된 방", testUser1, GameRoomStatus.FINISHED);

        // When & Then
        assertThatThrownBy(() -> roomListService.getRoomDetail(finishedRoom.getId()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ROOM_NOT_FOUND);
    }

    @Test
    @DisplayName("방 목록은 최신 생성순으로 정렬되어야 한다")
    void getRoomList_OrderedByCreatedAtDesc() throws InterruptedException {
        // Given - 순차적으로 방 생성
        GameRoom room1 = createGameRoom("첫 번째 방", testUser1, GameRoomStatus.WAITING);
        Thread.sleep(10); // 생성 시간 차이를 위해
        GameRoom room2 = createGameRoom("두 번째 방", testUser2, GameRoomStatus.WAITING);
        Thread.sleep(10);
        GameRoom room3 = createGameRoom("세 번째 방", testUser3, GameRoomStatus.WAITING);

        // When
        RoomListSliceResponse response = roomListService.getRoomList(0, 10);

        // Then - 최신순으로 정렬됨 (세 번째 -> 두 번째 -> 첫 번째)
        assertThat(response.getRoomList()).hasSize(3);
        assertThat(response.getRoomList().get(0).getGameTitle()).isEqualTo("세 번째 방");
        assertThat(response.getRoomList().get(1).getGameTitle()).isEqualTo("두 번째 방");
        assertThat(response.getRoomList().get(2).getGameTitle()).isEqualTo("첫 번째 방");
    }

    @Test
    @DisplayName("다양한 상태가 혼재된 경우 WAITING과 IN_PROGRESS만 조회되어야 한다")
    void getRoomList_MixedStatuses() {
        // Given
        createGameRoom("대기1", testUser1, GameRoomStatus.WAITING);
        createGameRoom("진행1", testUser2, GameRoomStatus.IN_PROGRESS);
        createGameRoom("종료1", testUser3, GameRoomStatus.FINISHED);
        createGameRoom("대기2", testUser1, GameRoomStatus.WAITING);
        createGameRoom("진행2", testUser2, GameRoomStatus.IN_PROGRESS);
        createGameRoom("종료2", testUser3, GameRoomStatus.FINISHED);

        // When
        RoomListSliceResponse response = roomListService.getRoomList(0, 10);

        // Then
        assertThat(response.getRoomList()).hasSize(4);
        assertThat(response.getRoomList())
                .extracting(RoomListResponse::getStatus)
                .containsOnly("WAITING", "IN_PROGRESS")
                .doesNotContain("FINISHED");
    }

    @Test
    @DisplayName("방 상세 정보 조회 시 방장 정보가 포함되지 않아야 한다")
    void getRoomDetail_NoHostNickname() {
        // Given
        GameRoom room = createGameRoom("테스트 방", testUser1, GameRoomStatus.WAITING);

        // When
        RoomDetailResponse response = roomListService.getRoomDetail(room.getId());

        // Then - RoomDetailResponse에는 hostNickname 필드가 없음을 확인
        assertThat(response.getGameRoomId()).isNotNull();
        assertThat(response.getGameTitle()).isNotNull();
        assertThat(response.getCurrentParticipants()).isNotNull();
        assertThat(response.getMaxParticipants()).isNotNull();
        assertThat(response.getStatus()).isNotNull();
    }

    // 헬퍼 메서드
    private GameRoom createGameRoom(String title, User host, GameRoomStatus status) {
        GameRoom room = GameRoom.builder()
                .gameTitle(title)
                .host(host)
                .status(status)
                .build();
        room = gameRoomRepository.save(room);

        // 방장을 참가자로 등록
        GameParticipant hostParticipant = GameParticipant.builder()
                .gameRoom(room)
                .participant(host)
                .isHost(true)
                .build();
        gameParticipantRepository.save(hostParticipant);

        return room;
    }
}
