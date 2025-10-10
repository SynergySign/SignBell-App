package app.signbell.backend.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

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