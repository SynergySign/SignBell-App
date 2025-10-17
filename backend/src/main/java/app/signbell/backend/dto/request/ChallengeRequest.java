// backend/src/main/java/app/signbell/backend/dto/request/ChallengeRequest.java
package app.signbell.backend.dto.request;

import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class ChallengeRequest {
    private Long quizWordId;
    private Integer questionNumber;
}