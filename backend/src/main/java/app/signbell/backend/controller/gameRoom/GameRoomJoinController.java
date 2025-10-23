package app.signbell.backend.controller.gameRoom;

import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.dto.response.JoinRoomResponse;
import app.signbell.backend.dto.response.ParticipantEventResponse;
import app.signbell.backend.dto.response.ParticipantResponse;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.exception.dto.ErrorResponse;
import app.signbell.backend.service.GameRoomJoinService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;

/**
 * GameRoomJoinController는 사용자가 특정 게임 방에 입장하거나 관련 이벤트를 처리하는
 * WebSocket 메시지 핸들러를 제공합니다.
 *
 * 이 컨트롤러는 사용자의 요청을 처리하고, 사용자 혹은 방의 모든 참가자에게
 * 관련 메시지를 전송하는 기능을 수행합니다.
 *
 * STOMP 프로토콜을 사용하며, 다음과 같은 메시지 경로를 처리합니다:
 * - 수신: /app/room/{gameRoomId}/join
 * - 개인 응답: /user/queue/room
 * - 브로드캐스트: /topic/room/{gameRoomId}/participant
 * - 에러 응답: /user/queue/errors
 *
 * @author 강관주
 * @since 2025-10-15
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class GameRoomJoinController {

    private final GameRoomJoinService gameRoomJoinService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 사용자가 특정 게임 방에 입장하는 요청을 처리하는 메서드.
     *
     * 이 메서드는 WebSocket 메시지 처리 메커니즘을 통해 호출됩니다.
     * 사용자 인증 정보를 활용하여 사용자 ID를 추출하고 해당 사용자를 게임 방에 입장 처리합니다.
     * 성공적으로 입장 시 사용자의 개인 메시지 큐를 통해 방 정보를 전송하며,
     * 방 전체 참가자에게는 새로운 참가자가 입장했음을 알리는 브로드캐스트를 발송합니다.
     *
     * 만약 처리 중 오류가 발생할 경우, 해당 사용자에게만 에러 메시지를 전송합니다.
     *
     * @param gameRoomId 사용자가 참여할 게임 방의 ID
     * @param principal WebSocket 연결을 통해 인증된 사용자의 인증 정보
     */
    @MessageMapping("/room/{gameRoomId}/join")
    public void joinRoom(
            @DestinationVariable Long gameRoomId,
            Principal principal
    ) {
        try {
            String subject = principal.getName();
            Long userId = Long.valueOf(subject);
            // 입장 요청 수신 로그
            log.info("방 입장 요청 수신 - userId: {}, gameRoomId: {}", userId, gameRoomId);

            // 1) 서비스 호출: 방 입장 처리(참가자 추가, 전체 정보 구성 등)
            JoinRoomResponse response = gameRoomJoinService.joinRoom(userId, gameRoomId);

            // 2) 입장자 개인에게 방 전체 정보를 전송
            messagingTemplate.convertAndSendToUser(
                    subject,
                    "/queue/room",
                    ApiResponse.success("방에 입장했습니다.", response)
            );

            // 3) 방 전체에 브로드캐스트 (새 참가자 알림)
            //    새로 입장한 참가자 정보를 추출하여 이벤트를 구성합니다.
            ParticipantResponse newParticipant = response.getParticipants()
                    .get(response.getParticipants().size() - 1);

            // 이벤트 객체 생성
            ParticipantEventResponse event = ParticipantEventResponse.builder()
                    .eventType("PARTICIPANT_JOINED")
                    .participant(newParticipant)
                    .currentParticipants(response.getCurrentParticipants())
                    .gameRoomId(gameRoomId)
                    .roomClosed(false)
                    .build();

            // 4) 브로드캐스트 (방 전체에 알림)
            messagingTemplate.convertAndSend(
                    "/topic/room/" + gameRoomId + "/participant",
                    ApiResponse.success("새로운 참가자가 입장했습니다.", event)
            );

            // 처리 완료 로그
            log.info("방 입장 처리 완료 - userId: {}, gameRoomId: {}", userId, gameRoomId);

        } catch (BusinessException e) {
            log.warn("방 입장 중 비즈니스 예외 발생 - errorCode: {}, message: {}",
                    e.getErrorCode().getCode(), e.getMessage());
            sendError(principal.getName(), e.getErrorCode());

        } catch (NumberFormatException e) {
            log.error("사용자 ID 파싱 실패 - subject: {}", principal.getName());
            sendError(principal.getName(), ErrorCode.INVALID_INPUT);

        } catch (Exception e) {
            log.error("방 입장 처리 중 예상치 못한 오류 발생", e);
            sendError(principal.getName(), ErrorCode.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * 에러 메시지를 특정 사용자에게 전송하는 메서드.
     *
     * 방 입장 처리 중 발생한 에러를 해당 사용자에게만 전송합니다.
     * ErrorCode를 기반으로 ErrorResponse 객체를 생성하여 전송합니다.
     *
     * @param userId 에러 메시지를 받을 사용자의 ID
     * @param errorCode 발생한 에러의 ErrorCode
     */
    private void sendError(String userId, ErrorCode errorCode) {
        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(errorCode.getStatus())
                .error(errorCode.getCode())
                .detail(errorCode.getMessage())
                .path("/app/room/join")
                .build();

        messagingTemplate.convertAndSendToUser(
                userId,
                "/queue/errors",
                error
        );

        log.warn("Error sent to user {} - code: {}, message: {}",
                userId, errorCode.getCode(), errorCode.getMessage());
    }
}
