package app.signbell.backend.dto.response.userData;

import app.signbell.backend.entity.LoginMethod;
import app.signbell.backend.entity.User;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserInfoResponse {
    private Long userId;
    private String nickname;
    private String profileImageUrl;
    private String providerId;
    private LoginMethod provider;
    private String email;
    private Boolean requiredAgree;
    private Boolean optionalAgree;

    /**
     * User 객체를 기반으로 UserInfoResponse 객체를 생성합니다.
     *
     * @param user User 객체로, 새로운 UserInfoResponse 객체 생성에 필요한 정보가 포함되어 있습니다.
     * @return UserInfoResponse 객체를 반환하며, User 객체의 정보를 기반으로 빌더 패턴을 통해 생성됩니다.
     *
     * @author 송민재
     * @since 2025-10-20
     */
    public static UserInfoResponse from(User user) {
        return UserInfoResponse.builder()
                .userId(user.getId())
                .nickname(user.getNickname())
                .profileImageUrl(user.getProfileImageUrl())
                .provider(user.getProvider())
                .providerId(user.getProviderId())
                .email(user.getEmail())
                .requiredAgree(user.getRequiredAgree())
                .optionalAgree(user.getOptionalAgree())
                .build();
    }
}
