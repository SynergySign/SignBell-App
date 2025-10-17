package app.signbell.backend.repository;

import app.signbell.backend.entity.GameHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * GameHistoryRepository 인터페이스는 게임 진행 내역(GameHistory 엔티티)에 대한 데이터베이스 CRUD 작업을 처리하기 위해
 * Spring Data JPA에서 제공하는 JpaRepository를 확장한 인터페이스입니다.
 *
 * 주요 기능:
 * - JpaRepository에서 기본 제공하는 메서드를 활용하여 GameHistory 데이터를 저장, 조회, 수정, 삭제할 수 있습니다.
 * - GameHistory 엔티티는 데이터베이스의 game_history 테이블과 매핑됩니다.
 * - Long 타입의 고유 ID(game_history_id)를 기본 키로 사용합니다.
 *
 * 이 인터페이스를 통해 게임 진행 내역을 효율적으로 관리할 수 있습니다.
 *
 * @author 고동현
 * @since 2025-10-12
 */
public interface GameHistoryRepository extends JpaRepository<GameHistory, Long> {

    /**
     * 특정 게임방의 점수를 내림차순으로 조회
     */
    @Query("SELECT gh FROM GameHistory gh " +
            "JOIN FETCH gh.participant " +
            "WHERE gh.gameRoom.id = :gameRoomId " +
            "ORDER BY gh.score DESC")
    List<GameHistory> findByGameRoom_IdOrderByScoreDesc(@Param("gameRoomId") Long gameRoomId);

    /**
     * 특정 사용자의 게임 기록 조회
     */
    @Query("SELECT gh FROM GameHistory gh " +
            "WHERE gh.gameRoom.id = :gameRoomId " +
            "AND gh.participant.id = :userId")
    Optional<GameHistory> findByGameRoom_IdAndParticipant_Id(
            @Param("gameRoomId") Long gameRoomId,
            @Param("userId") Long userId
    );

    List<GameHistory> findTop3ByGameRoom_IdOrderByScoreDesc(Long roomId);



}