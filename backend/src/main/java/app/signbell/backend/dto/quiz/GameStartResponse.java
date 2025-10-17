package app.signbell.backend.dto.quiz;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GameStartResponse {
    private Integer totalQuestions;
}
