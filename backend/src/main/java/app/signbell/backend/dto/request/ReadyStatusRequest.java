package app.signbell.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * ReadyStatusRequest 클래스는 특정 사용자의 '준비 상태'를 전달하기 위한 DTO입니다.
 *
 * 해당 클래스는 클라이언트가 준비 상태를 서버에 전달하거나 업데이트를 요청할 때 사용됩니다.
 * 주로 게임 방에서 특정 사용자의 준비 여부를 확인하거나 변경하는 데 활용됩니다.
 *
 * @author 강관주
 * @since 2025-10-17
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class ReadyStatusRequest {
    private boolean isReady;
}