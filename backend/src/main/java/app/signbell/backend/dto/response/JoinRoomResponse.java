package app.signbell.backend.dto.response;

import app.signbell.backend.entity.GameRoom;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * 게임방 참여 후 반환되는 응답 데이터를 담는 클래스.
 *
 * 이 클래스는 특정 게임방에 참가한 이후 해당 방의 정보를 포함한 응답 데이터로 사용된다.
 * 내부적으로 게임방의 ID, 제목, 방장, 참가자 정보, 현재 참가자 수, 최대 참가자 수, 현재 라운드, 상태값 등을 포함한다.
 *
 * 주요 용도:
 * - 게임방 참여 요청에 대한 응답 데이터 전달
 * - 클라이언트가 게임방의 상태를 확인할 수 있도록 정보를 제공
 *
 * @author 강관주
 * @since 2025-10-15
 */
@Getter
@Builder
public class JoinRoomResponse {
    private Long gameRoomId;
    private String gameTitle;
    private Long hostId;
    private List<ParticipantResponse> participants;
    private Integer currentParticipants;
    private Integer maxParticipants;
    private Integer currentRound;
    private String status;

    public static JoinRoomResponse of(GameRoom room, List<ParticipantResponse> participants) {
        return JoinRoomResponse.builder()
                .gameRoomId(room.getId())
                .gameTitle(room.getGameTitle())
                .hostId(room.getHost().getId())
                .participants(participants)
                .currentParticipants(room.getCurrentParticipants())
                .maxParticipants(room.getMaxParticipants())
                .currentRound(room.getCurrentRound())
                .status(room.getStatus().name())
                .build();
    }
}
