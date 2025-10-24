package app.signbell.backend.service;

import app.signbell.backend.dto.response.JoinRoomResponse;
import app.signbell.backend.dto.response.ParticipantResponse;
import app.signbell.backend.entity.GameParticipant;
import app.signbell.backend.entity.GameRoom;
import app.signbell.backend.entity.GameRoomStatus;
import app.signbell.backend.entity.User;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.GameParticipantRepository;
import app.signbell.backend.repository.GameRoomRepository;
import app.signbell.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * GameRoomJoinService 클래스는 게임 방에 참가시키는 로직을 제공하며,
 * 게임 방 상태 검증, 참가자 추가, 상태 반환 등의 작업을 처리합니다.
 *
 * 주요 책임:
 * - 게임 방 및 사용자 정보 조회
 * - 방 상태와 규칙에 따라 입장 가능 여부 확인
 * - 참가자 추가 및 방 상태 업데이트
 * - 현재 방 상태와 참가자 목록 반환
 *
 * 예외 상황:
 * - 방을 찾을 수 없는 경우
 * - 이미 시작된 방에 입장하려는 경우
 * - 다른 방에 이미 참가 중인 경우
 * - 방 인원이 이미 가득 찬 경우
 * - 동일한 방에 중복으로 입장 시도하는 경우
 *
 * @author 강관주
 * @since 2025-10-15
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class GameRoomJoinService {

    private final GameRoomRepository gameRoomRepository;
    private final GameParticipantRepository participantRepository;
    private final UserRepository userRepository;

    /**
     * 사용자가 특정 게임 방에 참여하는 기능을 제공합니다.
     * 방의 상태, 사용자 상태 및 조건 등을 확인한 뒤 참여 절차를 수행하며,
     * 최종적으로 현재 방의 상태와 참여자 정보를 반환합니다.
     *
     * @param userId 사용자의 고유 식별자
     * @param gameRoomId 참여하려는 게임 방의 고유 식별자
     * @return 현재 게임 방의 상태와 모든 참가자 정보를 포함하는 JoinRoomResponse 객체
     * @throws BusinessException 게임 방을 찾을 수 없거나 사용자가 이미 참여한 방이 있거나,
     *                            방이 이미 시작되었거나 방 인원이 가득 찬 경우 예외를 발생
     */
    public JoinRoomResponse joinRoom(Long userId, Long gameRoomId) {
        log.info("User {} attempting to join room {}", userId, gameRoomId);

        // 1. 방 존재 확인
        GameRoom room = gameRoomRepository.findById(gameRoomId)
                .orElseThrow(() -> {
                    log.error("게임 방을 찾을 수 없습니다. gameRoomId={}", gameRoomId);
                    return new BusinessException(ErrorCode.ROOM_NOT_FOUND);
                });

        // 2. 방 상태 확인 (WAITING만 입장 가능)
        if (room.getStatus() != GameRoomStatus.WAITING) {
            log.warn("이미 시작된 방입니다. gameRoomId={}, status={}", gameRoomId, room.getStatus());
            throw new BusinessException(ErrorCode.ROOM_ALREADY_STARTED);
        }

        // 3. 사용자 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.error("사용자를 찾을 수 없습니다. userId={}", userId);
                    return new BusinessException(ErrorCode.USER_NOT_FOUND);
                });

        // 4. 방장 여부 확인
        boolean isHost = room.getHost().getId().equals(userId);

        // 5. 이미 이 방에 참가했는지 확인
        boolean alreadyInThisRoom = participantRepository.existsByParticipantAndGameRoom(user, room);

        if (alreadyInThisRoom) {
            log.info("이미 이 방에 참가한 사용자입니다. userId={}, roomId={}", userId, gameRoomId);

            // 현재 방 상태 반환
            List<GameParticipant> allParticipants = participantRepository.findByGameRoom_Id(gameRoomId);
            List<ParticipantResponse> participantResponses = allParticipants.stream()
                    .map(ParticipantResponse::from)
                    .toList();

            return JoinRoomResponse.of(room, participantResponses);
        }

        // 6. 방장이 아닌 경우: 다른 방에 참여 중인지 확인
        if (!isHost) {
            boolean alreadyInRoom = participantRepository.existsByParticipantAndGameRoom_StatusIn(
                    user,
                    GameRoomStatus.WAITING,
                    GameRoomStatus.IN_PROGRESS
            );

            if (alreadyInRoom) {
                log.warn("이미 다른 방에 참여 중입니다. userId={}", userId);
                throw new BusinessException(ErrorCode.PARTICIPANT_ALREADY_IN_ROOM);
            }
        }

        // 7. 방 인원 확인 (최대 4명)
        if (room.getCurrentParticipants() >= 4) {
            log.warn("방 인원이 가득 찼습니다. gameRoomId={}, currentParticipants={}",
                    gameRoomId, room.getCurrentParticipants());
            throw new BusinessException(ErrorCode.ROOM_FULL);
        }

        // 8. 참가자 추가
        GameParticipant participant = GameParticipant.builder()
                .gameRoom(room)
                .participant(user)
                .isHost(false) // 방장이면 true, 아니면 false
                .build();

        participantRepository.save(participant);

        // 9. 방 인원 증가
        room.incrementParticipants();
        gameRoomRepository.save(room);

        // 10. 응답 생성
        List<GameParticipant> allParticipants = participantRepository.findByGameRoom_Id(gameRoomId);
        List<ParticipantResponse> participantResponses = allParticipants.stream()
                .map(ParticipantResponse::from)
                .toList();

        log.info("User {} successfully joined room {}. currentParticipants={}",
                userId, gameRoomId, room.getCurrentParticipants());

        return JoinRoomResponse.of(room, participantResponses);
    }
}
