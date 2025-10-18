package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/**
 * GameResultResponse 클래스는 게임 결과 데이터를 반환하기 위한 DTO입니다.
 *
 * 이 클래스는 게임 상위 3명의 플레이어 정보를 포함하며, 각 플레이어의 ID, 닉네임, 총 점수를 제공합니다.
 * 내부적으로 RankInfo라는 static inner 클래스를 사용하여 랭크 정보를 캡슐화합니다.
 *
 * 주요 용도:
 * - 게임 결과 랭킹 데이터 전달
 * - 클라이언트에서 상위 플레이어 정보를 표시하기 위해 사용
 *
 * @author 고동현
 * @since 2025-10-17
 */
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