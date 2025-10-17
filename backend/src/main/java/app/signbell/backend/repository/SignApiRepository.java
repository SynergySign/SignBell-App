package app.signbell.backend.repository;

import app.signbell.backend.entity.SignApi;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * SignApi 엔티티에 대한 데이터베이스 액세스를 처리하는 리포지토리입니다.
 * @since 2025-10-16
 * @author 백승현
 */
@Repository
public interface SignApiRepository extends JpaRepository<SignApi, Long> {
}