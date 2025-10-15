package app.signbell.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class UserProfileUpdateRequest {

    /**
     * 닉네임 (필수, 1~20자)
     */
    @NotBlank(message = "닉네임은 필수 입력 항목입니다.")
    @Size(min = 1, max = 20, message = "닉네임은 1자에서 20자 사이여야 합니다.")
    private String nickname;

    /**
     * 약관 동의 여부 (선택)
     */
    private Boolean optionalAgree;

    @Builder
    public UserProfileUpdateRequest(String nickname, Boolean optionalAgree) {
        this.nickname = nickname;
        this.optionalAgree = optionalAgree;
    }
}
