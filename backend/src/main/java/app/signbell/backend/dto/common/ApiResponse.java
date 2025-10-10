package app.signbell.backend.dto.common;

import lombok.*;

import java.time.LocalDateTime;

/**
 * @author 강관주
 * @since 2025-10-10
 * 클라이언트에게 일관적인 응답의 포맷을 위한 클래스
 */
@Getter
@ToString
@EqualsAndHashCode
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApiResponse<T> {

    // 응답 성공 여부
    private boolean success;

    // 응답 메시지
    private String message;

    // 응답 시간
    private LocalDateTime timestamp;

    // 응답 JSON
    private T data;

    // 응답 객체 생성 팩토리 메서드
    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .timestamp(LocalDateTime.now())
                .data(data)
                .build();
    }
}
