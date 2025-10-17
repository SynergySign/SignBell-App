package app.signbell.backend.dto.quiz;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * 게임 종료 응답 DTO
 * 
 * @author 고동현
 * @since 2025-10-17
 */
@Getter
@Builder
public class GameEndResponse {
    private String eventType;
    private Integer completedRound;
    private Integer nextRound;
    private List<RankingInfo> rankings;
    private Boolean backToWaitingRoom;
    private Integer delaySeconds;
}
