package app.signbell.backend.dto.response.signEdu;

import lombok.Builder;
import lombok.Getter;

/**
 * 단일 단어 상세 정보 조회 시 사용되는 응답 DTO입니다.
 */
@Getter
public class SignDetailResponseDto {

    private final Long signId;
    private final String wordName;
    private final String description;
    private final String videoUrl;
    private final String tag; // API 응답에서는 'tag'라는 이름으로 categoryType을 제공

    @Builder
    public SignDetailResponseDto(Long signId, String wordName, String description, String videoUrl, String tag) {
        this.signId = signId;
        this.wordName = wordName;
        this.description = description;
        this.videoUrl = videoUrl;
        this.tag = tag;
    }
}
