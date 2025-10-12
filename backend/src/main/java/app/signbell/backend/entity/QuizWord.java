package app.signbell.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * QuizWord 클래스는 퀴즈에 사용하는 단어 정보를 관리하는 엔티티입니다.
 * 해당 클래스는 데이터베이스의 quiz_word 테이블과 매핑되며,
 * 퀴즈 단어 ID 및 관련된 SignApi 정보를 포함하고 있습니다.
 *
 * 이 클래스는 데이터베이스와 연동되는 모델로서, 퀴즈 기능에서 사용되는 단어 정보를 저장, 조회 및 관리하는 데 활용됩니다.
 *
 * @author 고동현
 * @since 2025-10-12
 */
@Entity
@Table(name = "quiz_word")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class QuizWord {

    /**
     * 퀴즈용 단어 ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "quiz_word_id")
    private Long id;

    /**
     * sign_api 단어 ID (FK)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sign_api_id")
    private SignApi signApi;
}