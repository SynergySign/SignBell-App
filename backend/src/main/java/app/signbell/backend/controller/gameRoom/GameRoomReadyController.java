package app.signbell.backend.controller.gameRoom;

import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.dto.request.ReadyStatusRequest;
import app.signbell.backend.dto.response.ReadyStatusResponse;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.exception.dto.ErrorResponse;
import app.signbell.backend.service.GameRoomReadyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;

/**
 * GameRoomReadyController 클래스는 WebSocket을 통한 게임방 참가자의 준비 상태 변경 요청을 처리하는 컨트롤러입니다.
 *
 * 주요 역할:
 * 1. 클라이언트로부터 참가자 준비 상태 변경 요청을 수신합니다.
 * 2. JWT 기반 사용자 인증을 통해 요청자를 식별합니다.
 * 3. GameRoomReadyService를 호출하여 비즈니스 로직을 처리합니다.
 * 4. 변경된 준비 상태를 방의 모든 참가자에게 브로드캐스트합니다.
 * 5. 에러 발생 시 해당 사용자에게만 에러 메시지를 전송합니다.
 *
 * STOMP 프로토콜을 사용하며, 다음과 같은 메시지 경로를 처리합니다:
 * - 수신: /app/room/{gameRoomId}/participant/ready
 * - 브로드캐스트: /topic/room/{gameRoomId}/participant
 * - 에러 응답: /user/queue/errors
 *
 * @author 강관주
 * @since 2025-10-17
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class GameRoomReadyController {

    private final GameRoomReadyService gameRoomReadyService;
    private final SimpMessagingTemplate messagingTemplate;

    /**
     * 게임방 참가자의 준비 상태 변경 요청을 처리하는 메서드.
     *
     * 클라이언트가 /app/room/{gameRoomId}/participant/ready 경로로 메시지를 전송하면
     * 이 메서드가 호출되어 참가자의 준비 상태를 변경하고 결과를 브로드캐스트합니다.
     *
     * 처리 흐름:
     * 1. JWT 토큰에서 사용자 ID를 추출합니다.
     * 2. GameRoomReadyService를 호출하여 준비 상태를 변경합니다.
     * 3. 변경된 상태를 방의 모든 참가자에게 브로드캐스트합니다.
     * 4. 에러 발생 시 해당 사용자에게만 에러 메시지를 전송합니다.
     *
     * @param gameRoomId 준비 상태를 변경할 게임방의 ID (STOMP 목적지 경로에서 추출)
     * @param subject JWT 토큰에서 추출한 사용자 ID (Principal)
     * @param request 준비 상태 변경 요청 정보 (isReady: true/false)
     */
    @MessageMapping("/room/{gameRoomId}/participant/ready")
    public void updateReadyStatus(
            @DestinationVariable Long gameRoomId,
            @AuthenticationPrincipal String subject,
            @Payload ReadyStatusRequest request
    ) {
        try {
            // 준비 상태 변경 요청 수신 로그
            log.info("Ready status update request from user={} for room={}", subject, gameRoomId);

            // JWT subject(String)를 Long 타입의 userId로 변환
            Long userId = Long.valueOf(subject);

            // 서비스 호출: 준비 상태 변경 처리 및 전체 참가자의 준비 상태 계산
            ReadyStatusResponse response = gameRoomReadyService.updateReadyStatus(gameRoomId, userId, request.isReady());

            // 방의 모든 참가자에게 준비 상태 변경 알림 브로드캐스트
            // - 누가 준비 상태를 변경했는지
            // - 현재 모든 참가자가 준비 완료되었는지 (allReady)
            messagingTemplate.convertAndSend(
                    "/topic/room/" + gameRoomId + "/participant",
                    ApiResponse.success("참가자의 준비 상태가 변경되었습니다.", response)
            );


        } catch (BusinessException e) {
            log.warn("방 입장 중 비즈니스 예외 발생 - errorCode: {}, message: {}",
                    e.getErrorCode().getCode(), e.getMessage());
            sendError(subject, e.getErrorCode());

        } catch (NumberFormatException e) {
            log.error("사용자 ID 파싱 실패 - subject: {}", subject);
            sendError(subject, ErrorCode.INVALID_INPUT);

        } catch (Exception e) {
            log.error("방 입장 처리 중 예상치 못한 오류 발생", e);
            sendError(subject, ErrorCode.INTERNAL_SERVER_ERROR);
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
                .path("/app/room/participant/ready")
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
