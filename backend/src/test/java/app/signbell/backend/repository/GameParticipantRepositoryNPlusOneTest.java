package app.signbell.backend.repository;

import app.signbell.backend.entity.*;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * GameParticipantRepositoryNPlusOneTest 클래스는 GameParticipantRepository에 대한
 * N+1 문제 방지를 검증하는 테스트를 수행하기 위한 클래스입니다.
 *
 * 주요 목적:
 * - Repository 레이어의 쿼리를 실행한 결과가 N+1 문제를 발생시키지 않는지 확인합니다.
 * - GameParticipant 엔티티와 연관된 User 및 GameRoom 엔티티의 조회가 최적화되었는지 검증합니다.
 *
 * 주요 구성:
 * - @SpringBootTest: Spring Boot 애플리케이션 컨텍스트를 로드하여 통합 테스트 실행.
 * - @Transactional: 각 테스트 후 데이터 롤백을 보장하여 데이터 정합성을 유지.
 * - @DisplayName: 테스트 의도를 명시적으로 설명.
 *
 * 사용된 테스트 시나리오:
 * 1. GameRoom ID를 기준으로 GameParticipant를 조회하는 findByGameRoom_Id 메서드의 N+1 문제 여부를 검증.
 * 2. 특정 User ID를 기준으로 GameParticipant를 조회하는 findByParticipant_Id 메서드의 N+1 문제 여부를 검증.
 *
 * 테스트 환경 세팅:
 * - 데이터 초기화를 위한 @BeforeEach 메서드 제공.
 * - Hibernate 통계 API를 활용하여 실행된 쿼리 횟수를 측정 및 검증.
 *
 * 이 테스트는 GameParticipant와 연관된 엔티티를 JOIN FETCH 방식으로 조회하며,
 * 불필요한 추가 쿼리가 발생하지 않는지 확인합니다.
 *
 * @author 강관주
 * @since 2025-10-15
 */
@SpringBootTest
@Transactional
@DisplayName("GameParticipantRepository N+1 검증 테스트")
class GameParticipantRepositoryNPlusOneTest {

    @Autowired
    private GameParticipantRepository gameParticipantRepository;

    @Autowired
    private GameRoomRepository gameRoomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EntityManagerFactory emf;

    private User host;

    @BeforeEach
    void init() {
        host = userRepository.save(User.builder()
                .nickname("host")
                .email("host@example.com")
                .provider(LoginMethod.KAKAO)
                .providerId("host-1")
                .build());
    }

    private Statistics enableAndClearStats() {
        SessionFactory sf = emf.unwrap(SessionFactory.class);
        Statistics stats = sf.getStatistics();
        stats.setStatisticsEnabled(true);
        stats.clear();
        return stats;
    }

    @Test
    @DisplayName("findByGameRoom_Id: 참가자 User를 JOIN FETCH 하므로 N+1 없이 1회 조회로 충분해야 한다")
    void findByGameRoom_Id_should_not_trigger_NPlusOne() {
        // Given: 방 1개와 참가자 10명 생성
        GameRoom room = gameRoomRepository.save(GameRoom.builder()
                .gameTitle("ROOM-1")
                .host(host)
                .status(GameRoomStatus.WAITING)
                .build());

        List<User> users = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            users.add(userRepository.save(User.builder()
                    .nickname("user-" + i)
                    .email("user" + i + "@example.com")
                    .provider(LoginMethod.KAKAO)
                    .providerId("u-" + i)
                    .build()));
        }

        // 호스트 자신도 참가자로 추가
        gameParticipantRepository.save(GameParticipant.builder()
                .gameRoom(room)
                .participant(host)
                .isHost(true)
                .build());
        for (User u : users) {
            gameParticipantRepository.save(GameParticipant.builder()
                    .gameRoom(room)
                    .participant(u)
                    .isHost(false)
                    .build());
        }

        // When: 통계 초기화 후 조회 실행
        Statistics stats = enableAndClearStats();
        List<GameParticipant> participants = gameParticipantRepository.findByGameRoom_Id(room.getId());

        // 연관 엔티티 실제 접근 (지연 로딩이 있다면 여기서 추가 쿼리 발생)
        for (GameParticipant gp : participants) {
            gp.getParticipant().getNickname();
        }

        // Then: SELECT 쿼리는 단 1회여야 함 (JOIN FETCH로 N+1 방지)
        long queryCount = stats.getPrepareStatementCount();
        assertThat(queryCount)
                .as("JOIN FETCH로 한 번의 SELECT만 실행되어야 합니다. 실제 쿼리 수: " + queryCount)
                .isEqualTo(1);
    }

    @Test
    @DisplayName("findByParticipant_Id: GameRoom과 User를 JOIN FETCH 하므로 추가 쿼리 없이 1회여야 한다")
    void findByParticipant_Id_should_not_trigger_NPlusOne() {
        // Given: 방 1개 + 특정 참가자 1명
        GameRoom room = gameRoomRepository.save(GameRoom.builder()
                .gameTitle("ROOM-2")
                .host(host)
                .status(GameRoomStatus.WAITING)
                .build());

        User target = userRepository.save(User.builder()
                .nickname("target")
                .email("target@example.com")
                .provider(LoginMethod.KAKAO)
                .providerId("target-1")
                .build());

        gameParticipantRepository.save(GameParticipant.builder()
                .gameRoom(room)
                .participant(target)
                .isHost(false)
                .build());

        // When: 통계 초기화 후 조회 실행
        Statistics stats = enableAndClearStats();
        GameParticipant gp = gameParticipantRepository.findByParticipant_Id(target.getId()).orElseThrow();

        // 연관 엔티티 실제 접근
        gp.getParticipant().getNickname();
        gp.getGameRoom().getGameTitle();

        // Then: SELECT 쿼리는 단 1회여야 함
        long queryCount = stats.getPrepareStatementCount();
        assertThat(queryCount)
                .as("JOIN FETCH로 한 번의 SELECT만 실행되어야 합니다. 실제 쿼리 수: " + queryCount)
                .isEqualTo(1);
    }
}
