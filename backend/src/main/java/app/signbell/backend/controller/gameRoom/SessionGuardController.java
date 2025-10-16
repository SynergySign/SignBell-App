package app.signbell.backend.controller.gameRoom;

import app.signbell.backend.config.UserSessionRegistry;
import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.dto.response.WsSessionStatusResponse;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 사용자의 웹소켓(WebSocket) 세션 상태를 확인하는 컨트롤러입니다.
 *
 * 주요 역할:
 * - 현재 로그인한 사용자가 활성화된 웹소켓 세션을 가지고 있는지 확인
 * - 중복 접속 방지를 위한 세션 상태 체크 기능 제공
 *
 * API 엔드포인트: /api/ws/session
 *
 * @author 강관주
 * @since 2025-10-16
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ws/session")
@Slf4j
public class SessionGuardController {

    // 사용자의 웹소켓 세션 정보를 관리하는 레지스트리
    // userId와 sessionId의 매핑 정보를 저장하고 조회
    private final UserSessionRegistry userSessionRegistry;

    /**
     * 현재 사용자의 웹소켓 세션 활성 상태를 조회하는 API
     *
     * GET /api/ws/session/active
     *
     * 동작 과정:
     * 1. JWT 토큰에서 추출한 subject(사용자 ID)를 Long 타입으로 변환
     * 2. UserSessionRegistry에서 해당 사용자의 세션 ID 조회
     * 3. 세션 ID가 존재하면 활성(active=true), 없으면 비활성(active=false)
     * 4. 결과를 WsSessionStatusResponse에 담아 반환
     *
     * @param subject JWT 토큰의 subject 값 (사용자 ID를 문자열로 표현)
     *                @AuthenticationPrincipal 어노테이션으로 자동 주입
     * @return ResponseEntity<ApiResponse<WsSessionStatusResponse>>
     *         - active: 웹소켓 세션 활성 여부 (true/false)
     *         - reason: 상태 사유 ("ACTIVE_SESSION_EXISTS" 또는 "NONE")
     * @throws BusinessException subject를 Long으로 변환 실패 시 UNAUTHORIZED 에러
     */
    @GetMapping("/active")
    public ResponseEntity<ApiResponse<WsSessionStatusResponse>> getActive(@AuthenticationPrincipal String subject) {
        try {
            // 1. JWT subject(문자열)를 Long 타입의 userId로 변환
            Long userId = Long.valueOf(subject);

            // 2. 레지스트리에서 해당 사용자의 웹소켓 세션 ID 조회
            //    세션 ID가 있으면 현재 웹소켓 연결이 활성화되어 있다는 의미
            String sessionId = userSessionRegistry.getSessionId(userId);
            boolean active = sessionId != null;

            // 3. 조회 결과를 로그로 기록 (디버깅 및 모니터링 용도)
            log.info("WS 세션 활성 여부 조회. userId={}, active={}", userId, active);

            // 4. 응답 객체 생성
            //    - active가 true면 "ACTIVE_SESSION_EXISTS" (활성 세션 있음)
            //    - active가 false면 "NONE" (세션 없음)
            WsSessionStatusResponse body = WsSessionStatusResponse.builder()
                    .active(active)
                    .reason(active ? "ACTIVE_SESSION_EXISTS" : "NONE")
                    .build();

            // 5. 성공 응답 반환
            return ResponseEntity.ok(ApiResponse.success("WS 세션 활성 여부", body));

        } catch (NumberFormatException e) {
            // subject가 숫자 형식이 아닌 경우 (비정상적인 JWT 토큰)
            log.error("인증된 사용자 ID(subject)를 Long으로 변환하는 데 실패했습니다: {}", subject, e);
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
    }
}