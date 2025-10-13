package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * CreateRoomResponse 클래스는 게임 방 생성에 대한 응답 정보를 담고 있는 객체를 표현합니다.
 *
 * 이 클래스는 생성된 게임 방 ID를 간단히 전달하는 데 사용됩니다.
 * 주어진 게임 방 ID를 기반으로 객체를 생성할 수 있으며,
 * 정적 팩토리 메서드를 통해 간결하고 명확하게 객체를 생성할 수 있습니다.
 *
 * @author 강관주
 * @since 2025-10-13
 */
@Getter
@AllArgsConstructor
public class CreateRoomResponse {

    private Long gameRoomId;

    public static CreateRoomResponse from(Long gameRoomId) {
        return new CreateRoomResponse(gameRoomId);
    }
}
