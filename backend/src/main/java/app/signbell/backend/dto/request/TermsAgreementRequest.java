package app.signbell.backend.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 약관 동의 요청 DTO
 *
 * @author 송민재
 * @since 2025-10-15
 */
@Getter
@NoArgsConstructor
public class TermsAgreementRequest {
    
    /**
     * 선택 약관 동의 여부
     */
    private Boolean optionalAgree;

    public TermsAgreementRequest(Boolean optionalAgree) {
        this.optionalAgree = optionalAgree;
    }
}
