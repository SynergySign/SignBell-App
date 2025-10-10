package app.signbell.backend.exception.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 에러 응답을 나타내는 클래스.
 * API 요청 처리 중 발생한 에러의 상세 정보를 클라이언트에게 전달하기 위해 사용됨.
 * HTTP 상태 코드, 에러 메시지, 발생 시간 등 관련 정보를 포함함.
 *
 * @author 강관주
 * @since 2025-10-10
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL) // 값이 null인 프로퍼티는 응답에서 제외함
public class ErrorResponse {

    // 에러 발생 시간
    private LocalDateTime timestamp;

    // http status code
    private int status; // ex: 404, 500, 400 ..

    // 에러 코드 이름
    private String error; // ex : bad request, not found..

    // 상세 에러 정보
    private String detail;

    // 에러가 난 URL path
    private String path;

    // 유효성 검증 에러 목록
    private List<ValidationError> validationErrors;

    // 입력값 검증 오류 1개를 포장할 내부 클래스
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ValidationError {
        // 에러가 난 필드명
        private String field;

        // 에러 원인 메시지
        private String message;

        // 거부된 값 (클라이언트가 뭐라고 보냈는지)
        private Object rejectedValue;
    }
}
