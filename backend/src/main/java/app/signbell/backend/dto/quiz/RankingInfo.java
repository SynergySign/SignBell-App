package app.signbell.backend.dto.quiz;

import lombok.Builder;
import lombok.Getter;

/**
 * 순위 정보 DTO
 * 
 * @author 고동현
 * @since 2025-10-17
 */
@Getter
@Builder
public class RankingInfo {
    private Integer rank;
    private Long userId;
    private String nickname;
    private String profileImageUrl;
    private Integer score;
}
