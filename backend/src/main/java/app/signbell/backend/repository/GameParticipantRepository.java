package app.signbell.backend.repository;

import app.signbell.backend.entity.GameParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameParticipantRepository extends JpaRepository<GameParticipant, Long> {
}