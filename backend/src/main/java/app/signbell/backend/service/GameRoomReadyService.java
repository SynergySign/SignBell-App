package app.signbell.backend.service;

import app.signbell.backend.dto.response.ReadyStatusResponse;
import app.signbell.backend.entity.GameParticipant;
import app.signbell.backend.entity.GameRoom;
import app.signbell.backend.entity.GameRoomStatus;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.GameParticipantRepository;
import app.signbell.backend.repository.GameRoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * GameRoomReadyService 클래스는 사용자와 게임방의 준비 상태를 관리하는 역할을 수행합니다.
 *
 * 주요 기능:
 * - 특정 게임 방에서 사용자의 준비 상태를 업데이트
 * - 업데이트된 준비 상태를 바탕으로 전체 참가자의 준비 여부 확인
 * - 요청 결과에 대한 응답 생성 및 반환
 *
 * 이 서비스는 게임 진행 상태, 방의 존재 여부, 참가자의 유효성 등을 검증하며,
 * 적절하지 않은 경우 예외를 발생시킵니다.
 *
 * 종속성:
 * - GameRoomRepository: 게임방 데이터 처리
 * - GameParticipantRepository: 게임 참가자 데이터 처리
 *
 * @author 강관주
 * @since 2025-10-17
 */
@Slf4j
@RequiredArgsConstructor
@Service
public class GameRoomReadyService {

    private final GameRoomRepository gameRoomRepository;
    private final GameParticipantRepository gameParticipantRepository;

    /**
     * 사용자가 특정 게임 방에서 준비 상태를 업데이트하는 메서드.
     * 준비 상태를 업데이트한 후, 전체 참가자의 준비 상태를 계산하여 응답 객체를 반환합니다.
     *
     * @param roomId 준비 상태를 업데이트할 게임 방의 ID
     * @param userId 준비 상태를 변경할 사용자의 ID
     * @param isReady 변경할 준비 상태 (true: 준비 완료, false: 준비 취소)
     * @return 준비 상태 변경 결과를 포함한 ReadyStatusResponse 객체
     * @throws BusinessException 게임 방이 존재하지 않거나, 게임 상태가 유효하지 않거나,
     *                           참가자가 존재하지 않거나, 방장이 준비 상태를 변경하려는 경우 발생
     */
    @Transactional
    public ReadyStatusResponse updateReadyStatus(Long roomId, Long userId, boolean isReady) {
        log.info("User {} attempting to update ready status in room {}", userId, roomId);

        // 1. 방 존재 및 상태 확인 (빠른 실패 전략)
        GameRoom room = gameRoomRepository.findById(roomId)
                .orElseThrow(() -> {
                    log.error("게임 방을 찾을 수 없습니다. gameRoomId={}", roomId);
                    return new BusinessException(ErrorCode.ROOM_NOT_FOUND);
                });

        // 2. 방 상태 검증
        if (room.getStatus() == GameRoomStatus.IN_PROGRESS) {
            log.warn("이미 진행 중인 방입니다. gameRoomId={}", roomId);
            throw new BusinessException(ErrorCode.ROOM_ALREADY_STARTED);
        }
        if (room.getStatus() == GameRoomStatus.FINISHED) {
            log.warn("이미 종료된 방입니다. gameRoomId={}", roomId);
            throw new BusinessException(ErrorCode.ROOM_ALREADY_FINISHED);
        }

        // 3. 참가자 조회 (User 정보 포함, JOIN FETCH로 N+1 방지)
        GameParticipant gameParticipant = gameParticipantRepository
                .findByGameRoom_IdAndParticipant_Id(roomId, userId)
                .orElseThrow(() -> {
                    log.error("참가자를 찾을 수 없습니다. userId={}, roomId={}", userId, roomId);
                    return new BusinessException(ErrorCode.PARTICIPANT_NOT_FOUND);
                });

        // 4. 방장은 항상 준비 상태이므로 변경 불가
        if (gameParticipant.isHost()) {
            log.info("방장은 항상 레디 상태입니다 - userId: {}, roomId: {}", userId, roomId);
            
            // 🔥 방장의 레디 상태를 항상 true로 유지 (에러 대신 자동 설정)
            if (!gameParticipant.isReady()) {
                gameParticipant.changeReadyStatus(true);
                log.info("✅ 방장 레디 상태 자동 복구 - userId: {}", userId);
            }
            
            // 전체 참가자의 준비 상태 계산
            List<GameParticipant> allParticipants = gameParticipantRepository
                    .findByGameRoom_Id(roomId);

            boolean allReady = allParticipants.stream()
                    .allMatch(GameParticipant::isReady);

            // 방장은 항상 레디 상태이므로 현재 상태 반환
            return ReadyStatusResponse.builder()
                    .eventType("PARTICIPANT_READY_UPDATED")
                    .userId(userId)
                    .nickname(gameParticipant.getParticipant().getNickname())
                    .isReady(true)  // 방장은 항상 true
                    .allReady(allReady)
                    .build();
        }

        // 5. 준비 상태 변경 (save() 불필요 - Dirty Checking 자동 처리)
        gameParticipant.changeReadyStatus(isReady);
        log.info("User {} ready status changed to {} in room {}", userId, isReady, roomId);

        // 6. 전체 참가자의 준비 상태 계산
        List<GameParticipant> allParticipants = gameParticipantRepository
                .findByGameRoom_Id(roomId);

        boolean allReady = allParticipants.stream()
                .allMatch(GameParticipant::isReady);

        log.info("Room {} ready status - allReady: {}, participants: {}",
                roomId, allReady, allParticipants.size());

        // 7. 응답 생성 (이미 fetch된 User 정보 활용)
        return ReadyStatusResponse.builder()
                .eventType("PARTICIPANT_READY_UPDATED")
                .userId(userId)
                .nickname(gameParticipant.getParticipant().getNickname())
                .isReady(isReady)
                .allReady(allReady)
                .build();
    }
}
