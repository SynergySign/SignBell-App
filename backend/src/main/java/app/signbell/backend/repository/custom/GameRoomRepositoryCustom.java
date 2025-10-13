package app.signbell.backend.repository.custom;

import app.signbell.backend.entity.GameRoom;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

/**
 * GameRoomRepositoryCustom은 게임방 엔티티(GameRoom)의 사용자 정의 쿼리 메서드를 정의하는 인터페이스입니다.
 *
 * @author 강관주
 * @since 2025-10-13
 */
public interface GameRoomRepositoryCustom {

    /**
     * WAITING 상태의 퀴즈 방 목록을 조회합니다. (무한 스크롤)
     *
     * @param pageable 페이징 정보
     * @return 방 목록 Slice
     */
    Slice<GameRoom> findWaitingRooms(Pageable pageable);
}
