
package app.signbell.backend.repository;

import app.signbell.backend.entity.LoginMethod;
import app.signbell.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/**
 * UserRepository 인터페이스는 사용자 정보(User 엔티티)에 대한 데이터베이스 CRUD 작업을 처리하기 위해
 * Spring Data JPA에서 제공하는 JpaRepository를 확장한 인터페이스입니다.
 *
 * 주요 기능:
 * - 기본적으로 JpaRepository에서 제공하는 메서드를 활용하여 사용자 데이터를 저장, 조회, 수정, 삭제할 수 있습니다.
 * - User 엔티티는 데이터베이스의 user 테이블과 매핑됩니다.
 * - Long 타입의 사용자 고유 ID(user_id)를 기본 키로 사용합니다.
 *
 * @author 고동현
 * @since 2025-10-12
 */
public interface UserRepository extends JpaRepository<User, Long> {
    //    Optional<User> findByProviderAndProviderId(String provider, String providerId);

    /**
     * Stiring -> LoginMetiond로 provider의 자료형 변환
     * 주어진 로그인 제공업체와 해당 제공업체 ID를 기반으로 사용자를 조회합니다.
     *
     * @param provider 로그인에 사용된 외부 제공업체 (예: Google, Kakao, Naver 등)의 종류
     * @param providerId 해당 제공업체가 부여한 사용자 고유 ID
     * @return 조건에 맞는 사용자(User) 객체를 감싸는 Optional. 사용자가 발견되지 않으면 Optional.empty()를 반환
     */
    Optional<User> findByProviderAndProviderId(LoginMethod provider, String providerId);

    /**
     * 주어진 OAuth 제공자에서 제공한 사용자 ID를 이용하여 사용자 정보를 검색합니다.
     *
     * @param providerId OAuth 제공자로부터 부여된 사용자 ID
     * @return 주어진 providerId에 해당하는 사용자를 가진 Optional 객체.
     *         사용자 정보가 없으면 비어 있는 Optional 반환.
     * @author 송민재
     * @since 2025.10.23
     */
    Optional<User> findByProviderId(String providerId);

    Optional<Object> findByid(Long id);

    /**
     * 누적 점수(totalScore)를 기준으로 내림차순 정렬하여 상위 8명의 사용자를 조회합니다.
     * 랭킹 시스템에서 사용됩니다.
     *
     * @return 상위 8명의 사용자 리스트
     * @author 강관주
     * @since 2025-10-28
     */
    List<User> findTop8ByOrderByTotalScoreDesc();
}