package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * WsSessionStatusResponse 클래스는 웹 소켓 세션 상태에 대한 응답 데이터를 나타냅니다.
 *
 * 이 클래스는 현재 웹 소켓 세션의 활성 상태와 그 이유를 포함하는 정보를 제공합니다.
 * 주로 클라이언트-서버 간의 웹 소켓 상태 점검 및 응답 데이터로 사용됩니다.
 *
 * 주요 필드:
 * - active: 웹 소켓 세션 활성 여부를 나타내는 boolean 값
 * - reason: 세부 상태 이유를 설명하는 문자열 (예: ACTIVE_SESSION_EXISTS, NONE)
 *
 * 주요 용도:
 * - 클라이언트가 웹 소켓 세션의 현재 상태를 확인할 수 있도록 정보를 전달
 * - 활성 세션의 존재 여부를 확인 및 상태에 따른 처리 로직에 활용
 *
 * @author 강관주
 * @since 2025-10-16
 */
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WsSessionStatusResponse {
    private boolean active;    // 활성 세션 존재 여부
    private String reason;     // ACTIVE_SESSION_EXISTS | NONE
}
