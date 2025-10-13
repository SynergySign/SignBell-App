package app.signbell.backend.dto.response;

import app.signbell.backend.entity.GameRoom;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * RoomListResponse 클래스는 게임 방 목록에 대한 정보를 담고 있는 객체를 표현합니다.
 *
 * 이 클래스는 게임 방 ID, 게임 제목, 방장 닉네임, 현재 참여자 수, 최대 참여자 수,
 * 현재 라운드 그리고 상태 정보를 포함합니다.
 *
 * 정적 팩토리 메서드인 from(GameRoom gameRoom)을 통해 GameRoom 엔티티로부터
 * RoomListResponse 객체를 간단하게 생성할 수 있습니다.
 *
 * @author 강관주
 * @since 2025-10-13
 */
@Getter
@Builder
@AllArgsConstructor
public class RoomListResponse {
    private Long gameRoomId;
    private String gameTitle;
    private String hostNickname;
    private Integer currentParticipants;
    private Integer maxParticipants;
    private Integer currentRound;
    private String status;

    public static RoomListResponse from(GameRoom gameRoom) {
        return RoomListResponse.builder()
                .gameRoomId(gameRoom.getId())
                .gameTitle(gameRoom.getGameTitle())
                .hostNickname(gameRoom.getHost().getNickname())
                .currentParticipants(gameRoom.getCurrentParticipants())
                .maxParticipants(gameRoom.getMaxParticipants())
                .currentRound(gameRoom.getCurrentRound())
                .status(gameRoom.getStatus().name())
                .build();
    }
}
