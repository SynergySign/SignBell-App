package app.signbell.backend.exception;

import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 애플리케이션 내에서 비즈니스 로직 처리 중 발생할 수 있는 예외를 나타내는 클래스입니다.
 * 이 클래스는 런타임 예외를 확장하며, 사용자 정의 비즈니스 예외를 정의하는 데 사용됩니다.
 *
 * 주요 기능:
 * - 메시지를 바탕으로 예외를 생성할 수 있습니다.
 * - ErrorCode를 기반으로 예외를 생성할 수 있습니다.
 * - ErrorCode를 통해 확장된 에러 정보를 제공합니다.
 *
 * @author 강관주
 * @since 2025-10-10
 */
@Getter
@NoArgsConstructor
public class BusinessException extends RuntimeException {

    private ErrorCode errorCode;

    public BusinessException(String message) {
        super(message);
    }

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}
