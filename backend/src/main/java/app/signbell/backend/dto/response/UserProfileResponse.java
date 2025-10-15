package app.signbell.backend.dto.response;

import app.signbell.backend.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * 마이페이지에 유저 프로필 정보를 제공하는 DTO
 *
 * @author 송민재
 * @since 2025-10-15
 */
@Getter
@Builder
@AllArgsConstructor
public class UserProfileResponse {
    private String nickname;
    private String profileImageUrl;
    private Boolean optionalAgree;

    public static UserProfileResponse from(User user) {
        return UserProfileResponse.builder()
                .nickname(user.getNickname())
                .profileImageUrl(user.getProfileImageUrl())
                .optionalAgree(user.getOptionalAgree())
                .build();
    }
}
