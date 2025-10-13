package app.signbell.backend.repository;

import app.signbell.backend.entity.GameParticipant;
import app.signbell.backend.entity.GameRoomStatus;
import app.signbell.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameParticipantRepository extends JpaRepository<GameParticipant, Long> {

    /**
     * 사용자가 특정 상태의 방에 참여 중인지 확인
     * @param participant 참여자
     * @param statuses 확인할 방 상태들 (WAITING, IN_PROGRESS)
     * @return 참여 중이면 true
     */
    boolean existsByParticipantAndGameRoom_StatusIn(User participant, GameRoomStatus... statuses);
}