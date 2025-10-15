package app.signbell.backend.service;

import app.signbell.backend.dto.response.JoinRoomResponse;
import app.signbell.backend.entity.*;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.GameParticipantRepository;
import app.signbell.backend.repository.GameRoomRepository;
import app.signbell.backend.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.*;

/**
 * GameRoomJoinServiceTest 클래스는 GameRoomJoinService의 통합 테스트를 수행합니다.
 *
 * 이 클래스는 다음과 같은 테스트 시나리오를 포함합니다:
 * 1. 정상적인 방 입장 처리 및 상태 확인.
 * 2. 존재하지 않는 게임 방 입장 시도.
 * 3. 존재하지 않는 사용자의 방 입장 시도.
 * 4. 이미 시작된 게임 방 입장 시도.
 * 5. 방이 이미 최대 인원에 도달한 경우 입장 시도.
 * 6. 사용자가 다른 대기/진행 중인 방에 참여 중인 경우의 입장 시도.
 *
 * 위 테스트는 GameRoomRepository, GameParticipantRepository, UserRepository와의 상호 작용,
 * 예외 처리 로직, 서비스의 주요 비즈니스 로직 검증을 목표로 합니다.
 *
 * 테스트는 @SpringBootTest 및 @Transactional로 설정되어 있으며, 테스트 실행 시 데이터베이스 상태가 롤백됩니다.
 *
 * @author 강관주
 * @since 2025-10-15
 */
@SpringBootTest
@Transactional
@DisplayName("GameRoomJoinService 통합 테스트")
class GameRoomJoinServiceTest {

    @Autowired
    private GameRoomJoinService service;

    @Autowired
    private GameRoomRepository gameRoomRepository;

    @Autowired
    private GameParticipantRepository participantRepository;

    @Autowired
    private UserRepository userRepository;

    private User createUser(String name) {
        return userRepository.save(User.builder()
                .nickname(name)
                .email(name + "@example.com")
                .provider(LoginMethod.KAKAO)
                .providerId("pid-" + name)
                .build());
    }

    private GameRoom createRoom(String title, User host, GameRoomStatus status) {
        return gameRoomRepository.save(GameRoom.builder()
                .gameTitle(title)
                .host(host)
                .status(status)
                .build());
    }

    @Test
    @DisplayName("대기 중 방에 정상 입장하면 참가자 추가 및 인원 수 증가")
    void joinRoom_success() {
        // Given
        User host = createUser("host");
        GameRoom room = createRoom("ROOM", host, GameRoomStatus.WAITING);
        User user = createUser("guest");

        // When
        JoinRoomResponse res = service.joinRoom(user.getId(), room.getId());

        // Then
        assertThat(res.getGameRoomId()).isEqualTo(room.getId());
        assertThat(res.getStatus()).isEqualTo(GameRoomStatus.WAITING.name());
        assertThat(res.getCurrentParticipants()).isEqualTo(2);
        assertThat(res.getParticipants()).extracting("userId").contains(user.getId());
        assertThat(participantRepository.countByGameRoom_Id(room.getId())).isEqualTo(1);
    }

    @Test
    @DisplayName("존재하지 않는 방이면 ROOM_NOT_FOUND")
    void joinRoom_roomNotFound() {
        // Given
        User user = createUser("user");

        // When & Then
        assertThatThrownBy(() -> service.joinRoom(user.getId(), -1L))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ROOM_NOT_FOUND);
    }

    @Test
    @DisplayName("존재하지 않는 사용자면 USER_NOT_FOUND")
    void joinRoom_userNotFound() {
        // Given
        User host = createUser("host");
        GameRoom room = createRoom("ROOM", host, GameRoomStatus.WAITING);

        // When & Then
        assertThatThrownBy(() -> service.joinRoom(-1L, room.getId()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.USER_NOT_FOUND);
    }

    @Test
    @DisplayName("이미 시작된 방이면 ROOM_ALREADY_STARTED")
    void joinRoom_roomAlreadyStarted() {
        // Given
        User host = createUser("host");
        GameRoom room = createRoom("ROOM", host, GameRoomStatus.IN_PROGRESS);
        User user = createUser("user");

        // When & Then
        assertThatThrownBy(() -> service.joinRoom(user.getId(), room.getId()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ROOM_ALREADY_STARTED);
    }

    @Test
    @DisplayName("방이 가득 차면 ROOM_FULL")
    void joinRoom_roomFull() {
        // Given
        User host = createUser("host");
        GameRoom room = createRoom("ROOM", host, GameRoomStatus.WAITING);
        room.incrementParticipants();
        room.incrementParticipants();
        room.incrementParticipants();
        gameRoomRepository.save(room);
        User user = createUser("user");

        // When & Then
        assertThatThrownBy(() -> service.joinRoom(user.getId(), room.getId()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ROOM_FULL);
    }

    @Test
    @DisplayName("사용자가 다른 대기/진행중 방에 참여 중이면 PARTICIPANT_ALREADY_IN_ROOM")
    void joinRoom_participantAlreadyInAnotherRoom() {
        // Given
        User host = createUser("host");
        GameRoom targetRoom = createRoom("TARGET", host, GameRoomStatus.WAITING);
        User user = createUser("user");

        GameRoom otherRoom = createRoom("OTHER", host, GameRoomStatus.WAITING);
        participantRepository.save(GameParticipant.builder()
                .gameRoom(otherRoom)
                .participant(user)
                .isHost(false)
                .build());

        // When & Then
        assertThatThrownBy(() -> service.joinRoom(user.getId(), targetRoom.getId()))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.PARTICIPANT_ALREADY_IN_ROOM);
    }
}
