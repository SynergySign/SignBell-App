package app.signbell.backend.dto.response.signEdu;

import lombok.Builder;
import lombok.Getter;

/**
 * 카테고리별 단어 목록 조회 시 사용되는 간단한 응답 DTO입니다.
 */
@Getter
public class SignSimpleResponseDto {

    private final Long signId;
    private final String wordName;

    @Builder
    public SignSimpleResponseDto(Long signId, String wordName) {
        this.signId = signId;
        this.wordName = wordName;
    }
}
