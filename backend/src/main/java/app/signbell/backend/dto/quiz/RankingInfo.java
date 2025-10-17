package app.signbell.backend.dto.quiz;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RankingInfo {
    private Long userId;
    private String nickname;
    private Integer score;
}
