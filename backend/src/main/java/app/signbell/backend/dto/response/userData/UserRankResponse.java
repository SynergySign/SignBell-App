package app.signbell.backend.dto.response.userData;

import app.signbell.backend.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * 사용자 랭킹 정보를 제공하는 DTO
 * 랭킹 보드에서 사용자의 순위, 닉네임, 점수, 프로필 이미지를 표시하기 위해 사용됩니다.
 *
 * @author 강관주
 * @since 2025-10-28
 */
@Getter
@Builder
@AllArgsConstructor
public class UserRankResponse {
    /**
     * 사용자 순위 (1~8)
     */
    private Integer rank;

    /**
     * 사용자 닉네임
     */
    private String nickname;

    /**
     * 사용자 누적 점수
     */
    private Long score;

    /**
     * 사용자 프로필 이미지 URL (nullable)
     */
    private String profileImage;

    /**
     * User 엔티티와 순위를 기반으로 UserRankResponse 객체를 생성하는 정적 팩토리 메서드
     *
     * @param user User 엔티티
     * @param rank 사용자 순위
     * @return UserRankResponse 객체
     */
    public static UserRankResponse from(User user, int rank) {
        return UserRankResponse.builder()
                .rank(rank)
                .nickname(user.getNickname())
                .score(user.getTotalScore())
                .profileImage(user.getProfileImageUrl())
                .build();
    }
}
