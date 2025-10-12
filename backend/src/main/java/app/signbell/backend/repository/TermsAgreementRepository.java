package app.signbell.backend.repository;

import app.signbell.backend.entity.TermsAgreement;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * TermsAgreementRepository 인터페이스는 TermsAgreement 엔티티에 대한 데이터베이스 CRUD 작업을
 * 처리하기 위해 Spring Data JPA에서 제공하는 JpaRepository를 확장한 인터페이스입니다.
 *
 * 이 인터페이스를 통해 약관 동의 정보(TermsAgreement)의 저장, 조회, 수정, 삭제 작업을 수행할 수 있습니다.
 * TermsAgreement 엔티티는 데이터베이스의 terms_agreement 테이블과 매핑되며,
 * 사용자가 약관에 대해 동의한 정보를 관리합니다.
 *
 * 주요 기능:
 * - 특정 사용자의 약관 동의 정보 저장
 * - 사용자 및 약관 정보를 기준으로 동의 상태를 조회
 * - 약관 동의 정보의 수정 및 삭제
 *
 * @author 고동현
 * @since 2025-10-12
 */
public interface TermsAgreementRepository extends JpaRepository<TermsAgreement, Long> {
}