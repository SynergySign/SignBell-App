package app.signbell.backend.dto.quiz;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
public class GameEndResponse {
    private List<RankingInfo> rankings;
}
