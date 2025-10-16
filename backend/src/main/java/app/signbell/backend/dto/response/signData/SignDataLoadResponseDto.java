package app.signbell.backend.dto.response.signData;

import lombok.Getter;

/**
 * 외부 API로부터 수어 데이터를 로드한 후의 응답을 위한 DTO입니다.
 * 로드된 데이터의 개수와 결과 메시지를 포함합니다.
 * @since 2025-10-16
 * @author 백승현
 */
@Getter
public class SignDataLoadResponseDto {

    private final long loadedCount;
    private final String message;

    public SignDataLoadResponseDto(long loadedCount) {
        this.loadedCount = loadedCount;
        this.message = loadedCount + "개의 수어 데이터가 성공적으로 로드되었습니다.";
    }
}