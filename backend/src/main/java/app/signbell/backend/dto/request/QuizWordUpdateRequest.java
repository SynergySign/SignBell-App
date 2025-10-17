package app.signbell.backend.dto.request;

import app.signbell.backend.entity.SignStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;
/**
 * 학습 상태가 완료인 단어를 QuizWord에 업데이트하기 위한 요청 DTO입니다.
 *
 * @since 2025-10-16
 * @author 백승현
 */
@Getter
@NoArgsConstructor
public class QuizWordUpdateRequest {
    private SignStatus newStatus;
}
