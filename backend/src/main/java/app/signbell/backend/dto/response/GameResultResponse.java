package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class GameResultResponse {
    private List<RankInfo> topThree;

    @Getter
    @AllArgsConstructor
    public static class RankInfo {
        private Long userId;
        private String nickname;
        private Integer totalScore;
    }
}