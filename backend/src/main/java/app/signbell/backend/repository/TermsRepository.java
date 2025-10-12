package app.signbell.backend.repository;

import app.signbell.backend.entity.Terms;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * TermsRepository 인터페이스는 Terms 엔티티에 대한 데이터베이스 CRUD 작업을 처리하기 위해
 * Spring Data JPA에서 제공하는 JpaRepository를 확장한 인터페이스입니다.
 *
 * 이 인터페이스를 통해 약관 정보(Terms)에 대한 저장, 조회, 수정, 삭제 작업을 수행할 수 있습니다.
 *
 * 대표적으로 다음과 같은 기능을 제공합니다:
 * - 약관 정보의 생성(Create)
 * - 약관 정보의 조회(Read)
 * - 약관 정보의 수정(Update)
 * - 약관 정보의 삭제(Delete)
 *
 * @author 고동현
 * @since 2025-10-12
 */
public interface TermsRepository extends JpaRepository<Terms, Long> {
}