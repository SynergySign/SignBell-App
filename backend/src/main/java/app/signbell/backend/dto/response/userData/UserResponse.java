package app.signbell.backend.dto.response.userData;

import app.signbell.backend.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 @author 송민재
 @since 2025-10-20 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String nickname;

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getNickname()
        );
    }
}