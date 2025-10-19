package app.signbell.backend.dto.response;

import app.signbell.backend.entity.GameRoom;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * RoomDetailResponse 클래스는 특정 게임 방의 상세 정보를 담고 있는 응답 객체입니다.
 *
 * 이 클래스는 게임 방 ID, 게임 제목, 현재 참여자 수, 최대 참여자 수, 상태 정보를 포함합니다.
 *
 * 정적 팩토리 메서드인 from(GameRoom gameRoom)을 통해 GameRoom 엔티티로부터
 * RoomDetailResponse 객체를 간단하게 생성할 수 있습니다.
 *
 * @author 강관주
 * @since 2025-10-19
 */
@Getter
@Builder
@AllArgsConstructor
public class RoomDetailResponse {
    private Long gameRoomId;
    private String gameTitle;
    private Integer currentParticipants;
    private Integer maxParticipants;
    private String status;

    public static RoomDetailResponse from(GameRoom gameRoom) {
        return RoomDetailResponse.builder()
                .gameRoomId(gameRoom.getId())
                .gameTitle(gameRoom.getGameTitle())
                .currentParticipants(gameRoom.getCurrentParticipants())
                .maxParticipants(gameRoom.getMaxParticipants())
                .status(gameRoom.getStatus().name())
                .build();
    }
}