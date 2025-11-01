package app.signbell.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 약관 동의 상태 업데이트 요청 DTO
 * 
 * @author Kiro AI
 * @since 2025-10-31
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class AgreementUpdateRequest {
    private Boolean requiredAgree;
    private Boolean optionalAgree;
}
