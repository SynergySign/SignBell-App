package app.signbell.backend.repository;

import app.signbell.backend.entity.GameParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

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
}