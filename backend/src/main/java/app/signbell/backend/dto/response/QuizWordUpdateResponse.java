// app.signbell.backend.dto.response 패키지에 생성
package app.signbell.backend.dto.response;

import app.signbell.backend.entity.Sign;
import app.signbell.backend.entity.SignStatus;
import lombok.Getter;

@Getter
public class QuizWordUpdateResponse {

    private final Long signId;
    private final String title;
    private final SignStatus newStatus;
    private final String message;

    public QuizWordUpdateResponse(Sign sign) {
        this.signId = sign.getId();
        this.title = sign.getTitle();
        this.newStatus = sign.getLearningStatus();
        this.message = String.format("ID %d번 단어 '%s'의 상태가 '%s'(으)로 성공적으로 업데이트되었습니다.",
                sign.getId(), sign.getTitle(), sign.getLearningStatus().getKoreanName());
    }
}