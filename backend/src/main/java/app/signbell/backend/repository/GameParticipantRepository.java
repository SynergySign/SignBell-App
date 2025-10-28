package app.signbell.backend.repository;

import app.signbell.backend.entity.GameParticipant;
import app.signbell.backend.entity.GameRoom;
import app.signbell.backend.entity.GameRoomStatus;
import app.signbell.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * GameParticipantRepository 인터페이스는 게임 대기실 참여자 정보(GameParticipant 엔티티)에 대한
 * 데이터베이스 CRUD 작업을 처리하기 위해 Spring Data JPA에서 제공하는
 * JpaRepository를 확장한 인터페이스입니다.
 *
 * 주요 기능:
 * - JpaRepository에서 기본 제공하는 메서드를 활용하여 GameParticipant 데이터를 저장, 조회, 수정, 삭제할 수 있습니다.
 * - GameParticipant 엔티티는 데이터베이스의 game_participant 테이블과 매핑됩니다.
 * - Long 타입의 대기실 참여자 고유 ID(game_participant_id)를 기본 키로 사용합니다.
 *
 * 이 인터페이스를 통해 게임 대기실의 참여자 데이터를 효율적으로 관리할 수 있습니다.
 *
 * @author 고동현
 * @since 2025-10-12
 */
public interface GameParticipantRepository extends JpaRepository<GameParticipant, Long> {

    /**
     * 사용자가 특정 상태의 방에 참여 중인지 확인
     * @param participant 참여자
     * @param statuses 확인할 방 상태들 (WAITING, IN_PROGRESS)
     * @return 참여 중이면 true
     */
    boolean existsByParticipantAndGameRoom_StatusIn(User participant, GameRoomStatus... statuses);

    /**
     * 특정 사용자가 특정 게임방에 참여 중인지 확인합니다.
     *
     * @param participant 게임방에 참여 여부를 확인할 사용자
     * @param gameRoom 사용자가 참여 여부를 확인할 게임방
     * @return 사용자가 해당 게임방에 참여 중이면 true, 그렇지 않으면 false
     */
    boolean existsByParticipantAndGameRoom(User participant, GameRoom gameRoom);

    /**
     * 특정 게임방의 모든 참가자 조회 (User 정보 함께 fetch)
     * N+1 문제 방지를 위해 participant를 즉시 로딩합니다.
     *
     * @param gameRoomId 게임방 ID
     * @return 해당 게임방의 참가자 리스트 (User 정보 포함)
     */
    @Query("SELECT gp FROM GameParticipant gp " +
            "JOIN FETCH gp.participant " +
            "WHERE gp.gameRoom.id = :gameRoomId")
    List<GameParticipant> findByGameRoom_Id(@Param("gameRoomId") Long gameRoomId);

    /**
     * 특정 사용자의 참가 정보 조회 (GameRoom과 User 정보 함께 fetch)
     * N+1 문제 방지를 위해 연관된 엔티티를 즉시 로딩합니다.
     *
     * @param userId 사용자 ID
     * @return 사용자의 참가 정보 (Optional, GameRoom 및 User 정보 포함)
     */
    @Query("SELECT gp FROM GameParticipant gp " +
            "JOIN FETCH gp.participant " +
            "JOIN FETCH gp.gameRoom " +
            "WHERE gp.participant.id = :userId")
    Optional<GameParticipant> findByParticipant_Id(@Param("userId") Long userId);

    /**
     * 특정 게임방의 참가자 수 조회
     * @param gameRoomId 게임방 ID
     * @return 해당 게임방의 참가자 수
     */
    long countByGameRoom_Id(Long gameRoomId);

    /**
     * 특정 게임방에서 특정 사용자의 참가 정보 조회
     * @param gameRoomId 게임방 ID
     * @param userId 사용자 ID
     * @return 참가 정보 Optional
     */
    @Query("SELECT gp FROM GameParticipant gp " +
            "JOIN FETCH gp.participant " +
            "JOIN FETCH gp.gameRoom " +
            "WHERE gp.gameRoom.id = :gameRoomId AND gp.participant.id = :userId")
    Optional<GameParticipant> findByGameRoom_IdAndParticipant_Id(@Param("gameRoomId") Long gameRoomId,
                                                                 @Param("userId") Long userId);

    /**
     * 특정 방의 모든 참가자를 한 번의 쿼리로 삭제
     *
     * @Modifying: 데이터 변경 쿼리임을 명시
     * @Query: JPQL로 직접 DELETE 쿼리 작성
     *
     * @param gameRoom 삭제할 게임방
     * @return 삭제된 참가자 수
     */
    @Modifying
    @Query("DELETE FROM GameParticipant gp WHERE gp.gameRoom = :gameRoom")
    int deleteAllByGameRoom(@Param("gameRoom") GameRoom gameRoom);


    Optional<GameParticipant> findByGameRoom_IdAndParticipant_IdAndIsHost(Long roomId, Long userId, Boolean isHost);

    /**
     * 특정 게임방의 모든 참가자 조회 (User와 GameRoom 정보 함께 fetch)
     * N+1 문제 방지를 위해 연관된 엔티티를 즉시 로딩합니다.
     * 
     * @param roomId 게임방 ID
     * @return 해당 게임방의 참가자 리스트 (User 및 GameRoom 정보 포함)
     */
    @Query("SELECT gp FROM GameParticipant gp " +
            "JOIN FETCH gp.participant " +
            "JOIN FETCH gp.gameRoom " +
            "WHERE gp.gameRoom.id = :roomId")
    List<GameParticipant> findAllByGameRoom_Id(@Param("roomId") Long roomId);

}
