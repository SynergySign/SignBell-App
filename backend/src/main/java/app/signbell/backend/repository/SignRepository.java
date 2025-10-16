package app.signbell.backend.repository;

import app.signbell.backend.entity.Sign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Sign 엔티티에 대한 데이터베이스 액세스를 처리하는 리포지토리입니다.
 * JpaRepository를 상속받아 기본적인 CRUD 기능을 자동 생성합니다.
 *
 * @author 백승현
 * @since 2025-10-16
 */
@Repository
public interface SignRepository extends JpaRepository<Sign, Long> {
}