package app.signbell.backend.entity;

/**
 * 게임방 상태 ENUM
 * game_room 테이블의 status 컬럼에 해당합니다.
 * @author 고동현
 * @since 2025-10-12
 */
public enum GameRoomStatus {
    WAITING,      // 대기중
    IN_PROGRESS,  // 진행중
    FINISHED      // 종료
}