package app.signbell.backend.dto.quiz;

import lombok.Builder;
import lombok.Getter;

/**
 * 게임 시작 응답 DTO
 *
 * 게임 시작 시 전체 문제 수를 클라이언트에 전달하기 위한 데이터 모델
 *
 * @author 고동현
 * @since 2025-10-17
 */
@Getter
@Builder
public class GameStartResponse {
    private Integer totalQuestions;
}
