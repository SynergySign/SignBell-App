package app.signbell.backend.dto.quiz;

import lombok.Builder;
import lombok.Getter;

/**
 * 다음 도전자 정보 응답 DTO
 *
 * 다음 문제를 풀 차례인 사용자의 ID와 문제 번호를 전달하는 데이터 모델
 *
 * @author 고동현
 * @since 2025-10-17
 */
@Getter
@Builder
public class NextChallengerResponse {
    private Long userId;
    private Integer questionNumber;
}
