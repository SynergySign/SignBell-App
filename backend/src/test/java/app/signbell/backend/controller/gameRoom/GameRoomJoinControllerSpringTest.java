package app.signbell.backend.controller.gameRoom;

import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.dto.request.JoinRoomRequest;
import app.signbell.backend.dto.response.JoinRoomResponse;
import app.signbell.backend.dto.response.ParticipantEventResponse;
import app.signbell.backend.dto.response.ParticipantResponse;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.service.GameRoomJoinService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

/**
 * GameRoomJoinControllerSpringTest 클래스는 게임 방 참가 컨트롤러(GameRoomJoinController)의
 * Spring 통합 테스트를 실행하는 클래스입니다.
 * 주로 WebSocket을 사용한 메시지 전송과 관련된 동작을 검증하며,
 * 서비스와 컨트롤러 간의 데이터 흐름, 비즈니스 로직 및 에러 처리 동작을 테스트합니다.
 *
 * 테스트 시에는 @SpringBootTest와 @MockBean을 사용하여 Spring 컨텍스트를 로드하고,
 * 실제 의존성을 Mock으로 대체하여 독립적인 테스트 환경을 구성합니다.
 * 통신 관련 검증은 SimpMessagingTemplate을 Mock으로 설정하고,
 * ArgumentCaptor를 사용해 메시지 전송의 정확성을 검증합니다.
 *
 * 주요 테스트 기능:
 * 1. 방 참가에 성공한 경우 개인 응답 메시지 전송과 브로드캐스트 메시지 전송을 확인.
 * 2. 방이 가득 찬 경우 비즈니스 예외(Room Full)에 대한 메시지 처리 검증.
 * 3. subject가 올바르지 않은 경우 Invalid Input 에러 처리 검증.
 *
 * @author 강관주
 * @since 2025-10-15
 */
@SpringBootTest
@DisplayName("GameRoomJoinController Spring 통합 스타일 단위 테스트")
class GameRoomJoinControllerSpringTest {

    @Autowired
    private GameRoomJoinController controller;

    @MockBean
    private GameRoomJoinService gameRoomJoinService;

    @MockBean
    private SimpMessagingTemplate messagingTemplate;

    private JoinRoomResponse dummyResponse(Long roomId, int currentParticipants) {
        ParticipantResponse p1 = ParticipantResponse.builder()
                .userId(1L)
                .nickname("u1")
                .profileImageUrl(null)
                .isHost(true)
                .isReady(true)
                .build();
        ParticipantResponse p2 = ParticipantResponse.builder()
                .userId(2L)
                .nickname("u2")
                .profileImageUrl(null)
                .isHost(false)
                .isReady(false)
                .build();
        return JoinRoomResponse.builder()
                .gameRoomId(roomId)
                .gameTitle("ROOM")
                .hostId(1L)
                .participants(List.of(p1, p2))
                .currentParticipants(currentParticipants)
                .maxParticipants(4)
                .currentRound(1)
                .status("WAITING")
                .build();
    }

    @Test
    @DisplayName("성공: 개인 응답(/user/queue/room) + 브로드캐스트(/topic/room/{id}/participant) 전송")
    void joinRoom_success_personal_and_broadcast() {
        // ============================
        // Given: 주체/파라미터/서비스 응답 준비
        // - subject는 인증된 사용자 식별자(@AuthenticationPrincipal)
        // - service.joinRoom은 JoinRoomResponse를 반환하도록 설정
        // ============================
        Long gameRoomId = 10L;
        String subject = "42";
        Long userId = 42L;
        JoinRoomResponse response = dummyResponse(gameRoomId, 2);
        given(gameRoomJoinService.joinRoom(userId, gameRoomId)).willReturn(response);

        // ============================
        // When: 컨트롤러의 joinRoom 호출 (WebSocket 없이 직접 메서드 호출)
        // ============================
        controller.joinRoom(gameRoomId, new JoinRoomRequest(), subject);

        // ============================
        // Then: 메시지 전송 검증
        // 1) 개인 큐로 ApiResponse<JoinRoomResponse> 전송
        // 2) 브로드캐스트로 ApiResponse<ParticipantEventResponse> 전송
        // 3) 서비스가 정확한 파라미터로 호출되었는지 검증
        // ============================
        ArgumentCaptor<ApiResponse> personalCaptor = ArgumentCaptor.forClass(ApiResponse.class);
        verify(messagingTemplate).convertAndSendToUser(eq(subject), eq("/queue/room"), personalCaptor.capture());
        ApiResponse<?> personal = personalCaptor.getValue();
        assertThat(personal).isNotNull();
        assertThat(personal.isSuccess()).isTrue();
        assertThat(personal.getData()).isInstanceOf(JoinRoomResponse.class);
        assertThat((JoinRoomResponse) personal.getData()).isSameAs(response);

        ArgumentCaptor<ApiResponse> broadcastCaptor = ArgumentCaptor.forClass(ApiResponse.class);
        verify(messagingTemplate).convertAndSend(eq("/topic/room/" + gameRoomId + "/participant"), broadcastCaptor.capture());
        ApiResponse<?> broadcast = broadcastCaptor.getValue();
        assertThat(broadcast).isNotNull();
        assertThat(broadcast.isSuccess()).isTrue();
        assertThat(broadcast.getData()).isInstanceOf(ParticipantEventResponse.class);
        ParticipantEventResponse event = (ParticipantEventResponse) broadcast.getData();
        assertThat(event.getEventType()).isEqualTo("PARTICIPANT_JOINED");
        assertThat(event.getCurrentParticipants()).isEqualTo(response.getCurrentParticipants());
        ParticipantResponse expectedLast = response.getParticipants().get(response.getParticipants().size() - 1);
        assertThat(event.getParticipant().getUserId()).isEqualTo(expectedLast.getUserId());

        verify(gameRoomJoinService).joinRoom(userId, gameRoomId);
        verifyNoMoreInteractions(gameRoomJoinService, messagingTemplate);
    }

    @Test
    @DisplayName("비즈니스 예외: ROOM_FULL이면 개인 큐(/user/queue/errors)로 ErrorResponse 전송")
    void joinRoom_businessException_errorToUser() {
        // ============================
        // Given: 서비스가 BusinessException(ROOM_FULL)을 던지도록 설정
        // ============================
        Long gameRoomId = 20L;
        String subject = "42";
        Long userId = 42L;
        given(gameRoomJoinService.joinRoom(userId, gameRoomId))
                .willThrow(new BusinessException(ErrorCode.ROOM_FULL));

        // ============================
        // When: 컨트롤러 호출
        // ============================
        controller.joinRoom(gameRoomId, new JoinRoomRequest(), subject);

        // ============================
        // Then: 에러 응답이 개인 큐로 전송되며, ErrorResponse 필드가 올바른지 확인
        // ============================
        ArgumentCaptor<Object> errorCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSendToUser(eq(subject), eq("/queue/errors"), errorCaptor.capture());
        Object payload = errorCaptor.getValue();
        assertThat(payload).isInstanceOf(app.signbell.backend.exception.dto.ErrorResponse.class);
        app.signbell.backend.exception.dto.ErrorResponse err =
                (app.signbell.backend.exception.dto.ErrorResponse) payload;
        assertThat(err.getStatus()).isEqualTo(ErrorCode.ROOM_FULL.getStatus());
        assertThat(err.getError()).isEqualTo(ErrorCode.ROOM_FULL.getCode());
        assertThat(err.getDetail()).isEqualTo(ErrorCode.ROOM_FULL.getMessage());

        verify(gameRoomJoinService).joinRoom(userId, gameRoomId);
        verifyNoMoreInteractions(gameRoomJoinService, messagingTemplate);
    }

    @Test
    @DisplayName("subject 파싱 실패: INVALID_INPUT 에러가 개인 큐로 전송되고 서비스는 호출되지 않음")
    void joinRoom_invalidSubject_errorToUser() {
        // ============================
        // Given: 숫자가 아닌 subject 값 준비
        // ============================
        Long gameRoomId = 30L;
        String subject = "not-a-number";

        // ============================
        // When: 컨트롤러 호출
        // ============================
        controller.joinRoom(gameRoomId, new JoinRoomRequest(), subject);

        // ============================
        // Then: 서비스 미호출 + INVALID_INPUT ErrorResponse 전송 검증
        // ============================
        verify(gameRoomJoinService, never()).joinRoom(anyLong(), anyLong());

        ArgumentCaptor<Object> errorCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate).convertAndSendToUser(eq(subject), eq("/queue/errors"), errorCaptor.capture());
        Object payload = errorCaptor.getValue();
        assertThat(payload).isInstanceOf(app.signbell.backend.exception.dto.ErrorResponse.class);
        app.signbell.backend.exception.dto.ErrorResponse err =
                (app.signbell.backend.exception.dto.ErrorResponse) payload;
        assertThat(err.getStatus()).isEqualTo(ErrorCode.INVALID_INPUT.getStatus());
        assertThat(err.getError()).isEqualTo(ErrorCode.INVALID_INPUT.getCode());
        assertThat(err.getDetail()).isEqualTo(ErrorCode.INVALID_INPUT.getMessage());

        verifyNoMoreInteractions(gameRoomJoinService, messagingTemplate);
    }
}
