package app.signbell.backend.repository;

import app.signbell.backend.entity.Sign;
import app.signbell.backend.repository.custom.SignRepositoryCustom;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Sign 엔티티에 대한 데이터베이스 액세스를 처리하는 리포지토리입니다.
 * JpaRepository를 상속받아 기본적인 CRUD 기능을 자동 생성합니다.
 *
 * @author 백승현
 * @since 2025-10-16
 */
@Repository
public interface SignRepository extends JpaRepository<Sign, Long>, SignRepositoryCustom {
    /**
     * 특정 태그에 해당하는 모든 수어 단어를 조회합니다.
     * @param tag 조회할 태그명
     * @return 해당 태그를 가진 Sign 엔티티 리스트
     */
    Page<Sign> findByCategoryType(String categoryType, Pageable pageable);



}