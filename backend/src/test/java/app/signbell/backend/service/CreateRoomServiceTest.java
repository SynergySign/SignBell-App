package app.signbell.backend.service;

import app.signbell.backend.dto.request.CreateRoomRequest;
import app.signbell.backend.dto.response.CreateRoomResponse;
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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatThrownBy;

/**
 * CreateRoomServiceTest 클래스는 게임 방 생성 서비스(CreateRoomService)의 통합 테스트를 수행하기 위한 클래스입니다.
 *
 * 이 테스트 클래스는 Spring Boot 환경에서 통합 테스트를 수행하며, 각 테스트는 @Transactional 어노테이션을 통해
 * 데이터베이스의 변경 사항이 테스트 종료 후 자동으로 롤백됩니다.
 *
 * 주요 테스트 시나리오:
 * - 게임 방이 정상적으로 생성되고 데이터베이스에 저장되는지 확인.
 * - 방 생성 시 방장이 참가자로 등록되는지 검증.
 * - 존재하지 않는 사용자 ID를 이용해 방을 생성할 때 예외가 발생하는지 확인.
 * - 이미 대기 중인 상태의 방에 참여 중인 사용자가 새로운 방을 생성하려고 할 때 예외가 발생하는지 확인.
 * - 여러 사용자가 각각 방을 생성할 수 있는지 확인.
 * - 최대 길이의 방 제목이 올바르게 처리되는지 검증.
 * - 특수 문자가 포함된 방 제목이 정상적으로 저장되는지 확인.
 * - 트랜잭션(@Transactional) 어노테이션이 정상적으로 작동하는지 검증.
 * - 유효하지 않은 방 제목(예: 빈 문자열)이 저장되지 않도록 검증.
 *
 * 테스트 방법:
 * - 사용자(User), 게임 방(GameRoom), 그리고 게임 참가자(GameParticipant)와 관련된 데이터를 JpaRepository를 사용해 데이터베이스에 직접 접근.
 * - 각 테스트는 given-when-then 패턴으로 작성되어 이해하기 쉽게 구성.
 * - 모든 테스트는 필요한 경우 사용자 또는 관련된 데이터의 초기 구성을 포함.
 *
 * 참고 사항:
 * - @BeforeEach 및 @AfterEach 어노테이션을 활용하여 테스트 전후의 데이터 초기화.
 * - createRoom 메서드가 다양한 입력과 조건 내에서 올바르게 작동하는지 확인.
 * - BusinessException 클래스와 ErrorCode와 같은 비즈니스 로직 관련 에러 처리가 적절한지 검증.
 *
 * @author 강관주
 * @since 2025-10-14
 */
@SpringBootTest
@Transactional // 각 테스트 후 자동 롤백
@DisplayName("CreateRoomService 테스트")
class CreateRoomServiceTest {

    @Autowired
    private CreateRoomService createRoomService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GameRoomRepository gameRoomRepository;

    @Autowired
    private GameParticipantRepository gameParticipantRepository;

    private User testUser;

    @BeforeEach
    void setUp() {
        // 실제 DB에 테스트 사용자 저장
        testUser = User.builder()
                .nickname("testUser")
                .email("test@example.com")
                .provider(LoginMethod.KAKAO)
                .providerId("123")
                .build();
        testUser = userRepository.save(testUser);
    }


    @Test
    @DisplayName("정상적으로 게임 방이 생성되고 DB에 저장되어야 한다")
    void createRoom_Success() {
        // Given
        CreateRoomRequest request = new CreateRoomRequest("통합 테스트 방");

        // When
        CreateRoomResponse response = createRoomService.createRoom(request, testUser.getId());

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getGameRoomId()).isNotNull();

        // DB에서 실제로 저장된 방 조회
        GameRoom savedRoom = gameRoomRepository.findById(response.getGameRoomId())
                .orElseThrow();

        assertThat(savedRoom.getGameTitle()).isEqualTo("통합 테스트 방");
        assertThat(savedRoom.getHost().getId()).isEqualTo(testUser.getId());
        assertThat(savedRoom.getStatus()).isEqualTo(GameRoomStatus.WAITING);
    }

    @Test
    @DisplayName("방 생성 시 방장이 GameParticipant로 등록되어야 한다")
    void createRoom_HostIsRegisteredAsParticipant() {
        // Given
        CreateRoomRequest request = new CreateRoomRequest("참가자 테스트 방");

        // When
        CreateRoomResponse response = createRoomService.createRoom(request, testUser.getId());

        // Then
        GameRoom savedRoom = gameRoomRepository.findById(response.getGameRoomId())
                .orElseThrow();

        // 참가자 목록에서 방장 찾기
        List<GameParticipant> participants = gameParticipantRepository.findAll();
        GameParticipant hostParticipant = participants.stream()
                .filter(p -> p.getGameRoom().getId().equals(savedRoom.getId()))
                .filter(GameParticipant::isHost)
                .findFirst()
                .orElseThrow();

        assertThat(hostParticipant.getParticipant().getId()).isEqualTo(testUser.getId());
        assertThat(hostParticipant.isHost()).isTrue();
    }

    @Test
    @DisplayName("존재하지 않는 사용자 ID로 방 생성 시 예외가 발생해야 한다")
    void createRoom_UserNotFound_ThrowsException() {
        // Given
        Long nonExistentUserId = 99999L;
        CreateRoomRequest request = new CreateRoomRequest("실패할 방");

        // When & Then
        assertThatThrownBy(() ->
                createRoomService.createRoom(request, nonExistentUserId))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.USER_NOT_FOUND);

        // 예외 발생 시 방이 생성되지 않았는지 확인
        List<GameRoom> allRooms = gameRoomRepository.findAll();
        assertThat(allRooms).isEmpty();
    }

    @Test
    @DisplayName("이미 WAITING 상태의 방에 참여 중인 사용자는 방 생성이 불가능해야 한다")
    void createRoom_AlreadyInWaitingRoom_ThrowsException() {
        // Given - 먼저 첫 번째 방 생성
        CreateRoomRequest firstRequest = new CreateRoomRequest("첫 번째 방");
        createRoomService.createRoom(firstRequest, testUser.getId());

        // When & Then - 같은 사용자가 두 번째 방 생성 시도
        CreateRoomRequest secondRequest = new CreateRoomRequest("두 번째 방");
        assertThatThrownBy(() ->
                createRoomService.createRoom(secondRequest, testUser.getId()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode",
                        ErrorCode.PARTICIPANT_ALREADY_IN_ROOM);

        // 방이 하나만 생성되었는지 확인
        List<GameRoom> allRooms = gameRoomRepository.findAll();
        assertThat(allRooms).hasSize(1);
    }

    @Test
    @DisplayName("여러 사용자가 각각 방을 생성할 수 있어야 한다")
    void createRoom_MultipleUsersCanCreateRooms() {
        // Given
        User user2 = User.builder()
                .nickname("testUser2")
                .email("test2@example.com")
                .provider(LoginMethod.KAKAO)
                .providerId("456")
                .build();
        user2 = userRepository.save(user2);

        User user3 = User.builder()
                .nickname("testUser3")
                .email("test3@example.com")
                .provider(LoginMethod.KAKAO)
                .providerId("789")
                .build();
        user3 = userRepository.save(user3);

        // When
        CreateRoomResponse response1 = createRoomService.createRoom(
                new CreateRoomRequest("방1"), testUser.getId());
        CreateRoomResponse response2 = createRoomService.createRoom(
                new CreateRoomRequest("방2"), user2.getId());
        CreateRoomResponse response3 = createRoomService.createRoom(
                new CreateRoomRequest("방3"), user3.getId());

        // Then
        assertThat(response1.getGameRoomId()).isNotNull();
        assertThat(response2.getGameRoomId()).isNotNull();
        assertThat(response3.getGameRoomId()).isNotNull();

        // 세 개의 방이 모두 생성되었는지 확인
        List<GameRoom> allRooms = gameRoomRepository.findAll();
        assertThat(allRooms).hasSize(3);
    }

    @Test
    @DisplayName("방 제목이 최대 길이로 생성되어야 한다")
    void createRoom_MaxLengthTitle() {
        // Given
        String maxLengthTitle = "a".repeat(50); // 최대 50자
        CreateRoomRequest request = new CreateRoomRequest(maxLengthTitle);

        // When
        CreateRoomResponse response = createRoomService.createRoom(request, testUser.getId());

        // Then
        GameRoom savedRoom = gameRoomRepository.findById(response.getGameRoomId())
                .orElseThrow();
        assertThat(savedRoom.getGameTitle()).hasSize(50);
        assertThat(savedRoom.getGameTitle()).isEqualTo(maxLengthTitle);
    }

    @Test
    @DisplayName("특수 문자가 포함된 방 제목이 올바르게 저장되어야 한다")
    void createRoom_SpecialCharactersInTitle() {
        // Given
        String specialTitle = "테스트!@#$%^&*()_+-=[]{}|;:',.<>?";
        CreateRoomRequest request = new CreateRoomRequest(specialTitle);

        // When
        CreateRoomResponse response = createRoomService.createRoom(request, testUser.getId());

        // Then
        GameRoom savedRoom = gameRoomRepository.findById(response.getGameRoomId())
                .orElseThrow();
        assertThat(savedRoom.getGameTitle()).isEqualTo(specialTitle);
    }

    @Test
    @DisplayName("@Transactional 어노테이션으로 트랜잭션이 정상 작동해야 한다")
    void createRoom_TransactionWorksCorrectly() {
        // Given
        CreateRoomRequest request = new CreateRoomRequest("트랜잭션 테스트 방");

        // When
        CreateRoomResponse response = createRoomService.createRoom(request, testUser.getId());

        // Then
        // 같은 트랜잭션 내에서 조회 가능
        GameRoom room = gameRoomRepository.findById(response.getGameRoomId())
                .orElseThrow();
        assertThat(room).isNotNull();

        GameParticipant participant = gameParticipantRepository.findAll().stream()
                .filter(p -> p.getGameRoom().getId().equals(room.getId()))
                .findFirst()
                .orElseThrow();
        assertThat(participant).isNotNull();
    }

    @Test
    @DisplayName("빈 문자열이 아닌 유효한 방 제목만 저장되어야 한다")
    void createRoom_ValidTitleOnly() {
        // Given
        String validTitle = "유효한 방 제목";
        CreateRoomRequest request = new CreateRoomRequest(validTitle);

        // When
        CreateRoomResponse response = createRoomService.createRoom(request, testUser.getId());

        // Then
        GameRoom savedRoom = gameRoomRepository.findById(response.getGameRoomId())
                .orElseThrow();
        assertThat(savedRoom.getGameTitle())
                .isNotBlank()
                .isEqualTo(validTitle);
    }
}
