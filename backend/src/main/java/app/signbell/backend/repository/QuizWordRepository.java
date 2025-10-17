
package app.signbell.backend.repository;

import app.signbell.backend.entity.QuizWord;
import app.signbell.backend.entity.Sign;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * QuizWordRepository 인터페이스는 퀴즈 단어 정보(QuizWord 엔티티)에 대한 데이터베이스 CRUD 작업을 처리하기 위해
 * Spring Data JPA에서 제공하는 JpaRepository를 확장한 인터페이스입니다.
 *
 * 주요 기능:
 * - JpaRepository를 통해 QuizWord 데이터를 저장, 조회, 수정, 삭제할 수 있습니다.
 * - QuizWord 엔티티는 데이터베이스의 quiz_word 테이블과 매핑됩니다.
 * - Long 타입의 고유 ID(quiz_word_id)를 기본 키로 사용합니다.
 * - 퀴즈에 사용될 단어와 관련된 정보 관리 및 처리에 사용됩니다.
 *
 * @author 고동현
 * @since 2025-10-12
 */
public interface QuizWordRepository extends JpaRepository<QuizWord, Long> {

    /**
     * 주어진 Sign 엔티티에 해당하는 QuizWord가 존재하는지 확인합니다.
     * @param sign 확인할 Sign 엔티티
     * @return 존재하면 true, 그렇지 않으면 false
     * @since 2025-10-16
     * @author 백승현
     */
    boolean existsBySign(Sign sign);

    /**
     * 주어진 Sign 엔티티에 해당하는 QuizWord를 삭제합니다.
     * @param sign 삭제할 기준이 되는 Sign 엔티티
     * @since 2025-10-16
     * @author 백승현
     */
    void deleteBySign(Sign sign);




    /**
     * 랜덤하게 N개의 퀴즈 단어를 조회합니다. (N+1 방지)
     * Sign 엔티티를 JOIN FETCH로 즉시 로딩합니다.
     *
     * @param limit 조회할 단어 개수
     * @return 랜덤 퀴즈 단어 리스트
     */
    @Query(value = "SELECT qw FROM QuizWord qw " +
            "JOIN FETCH qw.sign " +
            "ORDER BY FUNCTION('RAND')")
    List<QuizWord> findRandomQuizWords(@Param("limit") int limit);

    /**
     * 전체 퀴즈 단어 개수 조회
     */
    @Query("SELECT COUNT(qw) FROM QuizWord qw")
    long countAllQuizWords();
}