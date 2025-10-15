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
 * GameRoomService 클래스는 게임 방 입장을 처리하는 서비스 클래스입니다.
 *
 * 주요 역할:
 * 1. 게임 방의 존재 여부와 상태를 검증합니다.
 * 2. 방 인원 수를 확인하여 입장 가능 여부를 판단합니다.
 * 3. 사용자가 중복으로 방에 참여 중인지 확인합니다.
 * 4. 참가자를 게임 방에 추가하고 DB에 저장합니다.
 * 5. 방의 현재 참가자 목록과 함께 입장 결과를 반환합니다.
 *
 * 사용자가 게임 방에 입장하려는 WebSocket 요청을 처리하며,
 * 필요한 경우 예외를 발생시켜 무결성을 보장합니다.
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
     * 사용자를 게임 방에 입장시키는 메서드.
     *
     * 주어진 사용자 ID와 게임 방 ID를 기반으로 방 입장을 처리합니다.
     * 방의 존재 여부, 상태, 인원 수, 중복 입장 여부를 검증한 후,
     * 참가자를 추가하고 방의 현재 상태를 응답 객체로 반환합니다.
     *
     * @param userId 방에 입장하려는 사용자의 ID
     * @param gameRoomId 입장하려는 게임 방의 ID
     * @return 입장한 방의 정보와 현재 참가자 목록을 포함하는 응답 객체
     * @throws BusinessException 방을 찾을 수 없거나, 이미 시작되었거나, 인원이 가득 찼거나, 중복 입장인 경우 발생
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

        // 3. 방 인원 확인 (최대 4명)
        if (room.getCurrentParticipants() >= 4) {
            log.warn("방 인원이 가득 찼습니다. gameRoomId={}, currentParticipants={}",
                    gameRoomId, room.getCurrentParticipants());
            throw new BusinessException(ErrorCode.ROOM_FULL);
        }

        // 4. 사용자 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.error("사용자를 찾을 수 없습니다. userId={}", userId);
                    return new BusinessException(ErrorCode.USER_NOT_FOUND);
                });

        // 5. 중복 입장 확인 - WAITING이나 IN_PROGRESS 상태의 방에 참여 중인지 확인
        boolean alreadyInRoom = participantRepository.existsByParticipantAndGameRoom_StatusIn(
                user,
                GameRoomStatus.WAITING,
                GameRoomStatus.IN_PROGRESS
        );

        if (alreadyInRoom) {
            log.warn("이미 다른 방에 참여 중입니다. userId={}", userId);
            throw new BusinessException(ErrorCode.PARTICIPANT_ALREADY_IN_ROOM);
        }

        // 6. 참가자 추가
        GameParticipant participant = GameParticipant.builder()
                .gameRoom(room)
                .participant(user)
                .isHost(false)
                .build();

        participantRepository.save(participant);

        // 7. 방 인원 증가
        room.incrementParticipants();
        gameRoomRepository.save(room);

        // 8. 응답 생성
        List<GameParticipant> allParticipants = participantRepository.findByGameRoom_Id(gameRoomId);
        List<ParticipantResponse> participantResponses = allParticipants.stream()
                .map(ParticipantResponse::from)
                .toList();

        log.info("User {} successfully joined room {}. currentParticipants={}",
                userId, gameRoomId, room.getCurrentParticipants());

        return JoinRoomResponse.of(room, participantResponses);
    }
}
