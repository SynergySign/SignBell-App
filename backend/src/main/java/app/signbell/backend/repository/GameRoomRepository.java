
package app.signbell.backend.repository;

import app.signbell.backend.entity.GameRoom;
import app.signbell.backend.repository.custom.GameRoomRepositoryCustom;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameRoomRepository extends JpaRepository<GameRoom, Long>, GameRoomRepositoryCustom {
}