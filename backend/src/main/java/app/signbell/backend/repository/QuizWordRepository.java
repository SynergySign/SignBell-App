
package app.signbell.backend.repository;

import app.signbell.backend.entity.QuizWord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizWordRepository extends JpaRepository<QuizWord, Long> {
}