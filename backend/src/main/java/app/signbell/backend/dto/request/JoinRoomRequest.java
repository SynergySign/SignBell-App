package app.signbell.backend.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 방 참가 요청 정보를 담는 클래스.
 *
 * 이 클래스는 특정 게임 방에 참가하기 위한 요청 데이터를 정의합니다.
 * `gameRoomId` 필드를 통해 사용자가 참가하고자 하는 게임 방의 고유 식별자를 설정합니다.
 *
 * @author 강관주
 * @since 2025-10-15
 */
@Getter
@NoArgsConstructor
public class JoinRoomRequest {
    private Long gameRoomId;
}
