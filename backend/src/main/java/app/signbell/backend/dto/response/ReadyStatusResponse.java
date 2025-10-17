package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * ReadyStatusResponse 클래스는 게임 내 참가자의 준비 상태에 대한 정보를 담고 있는 객체를 나타냅니다.
 *
 * 주요 사용처:
 * - 클라이언트-서버 간 통신에서 참가자의 준비 상태 변경 정보를 전달
 * - 실시간으로 참가자의 준비 상태를 UI 및 게임 로직에 반영
 *
 * @author 강관주
 * @since 2025-10-17
 */
@Getter
@Builder
@AllArgsConstructor
public class ReadyStatusResponse {
    private String eventType; // "PARTICIPANT_READY_UPDATED"
    private Long userId;
    private String nickname;
    private boolean isReady;
    private boolean allReady;
}
