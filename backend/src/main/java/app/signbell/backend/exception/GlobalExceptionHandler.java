package app.signbell.backend.exception;

import app.signbell.backend.exception.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * @author 강관주
 * @since 2025-10-10
 * 전역 예외처리 핸들러
 * 애플리케이션에서 발생하는 모든 예외를 일괸된 형식으로 처리
 */
@Slf4j
@RestControllerAdvice // AOP : 관점 지향 프로그래밍
public class GlobalExceptionHandler {

    /**
     * 비즈니스 예외(BusinessException)가 발생했을 때 처리하는 메서드.
     * 예외에 대한 상세 정보를 포함한 HTTP 응답 객체를 반환합니다.
     *
     * @param e BusinessException 발생한 비즈니스 예외 객체
     * @param request HttpServletRequest 예외가 발생한 요청의 세부 정보를 포함한 객체
     * @return ResponseEntity<?> 비즈니스 예외에 대한 상세 정보와 HTTP 상태 코드를 포함한 응답 객체
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<?> handleBusinessException(BusinessException e, HttpServletRequest request) {
        log.warn("비즈니스 예외 발생 : {}", e.getMessage());

        // 에러 응답객체 생성
        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .detail(e.getMessage())
                .path(request.getRequestURI())
                .status(e.getErrorCode().getStatus())
                .error(e.getErrorCode().getCode())
                .build();

        return ResponseEntity.status(e.getErrorCode().getStatus()).body(errorResponse);
    }

    /**
     * 유효성 검증 예외 처리 (@Valid, @Validated)
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException e) {
        List<ErrorResponse.ValidationError> validationErrors = e.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(fieldError -> ErrorResponse.ValidationError.builder()
                        .field(fieldError.getField())
                        .message(fieldError.getDefaultMessage())
                        .rejectedValue(fieldError.getRejectedValue())
                        .build())
                .collect(Collectors.toList());

        log.warn("유효성 검증 실패: {}", validationErrors);

        ErrorResponse response = ErrorResponse.builder()
                .validationErrors(validationErrors)
                .timestamp(LocalDateTime.now())
                .error(ErrorCode.VALIDATION_ERROR.getCode())
                .status(ErrorCode.VALIDATION_ERROR.getStatus())
                .build();

        return ResponseEntity.badRequest().body(response);
    }
}
