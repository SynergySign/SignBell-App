package app.signbell.backend.service;

import app.signbell.backend.dto.request.CreateRoomRequest;
import app.signbell.backend.dto.response.CreateRoomResponse;
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

/**
 * CreateRoomService 클래스는 게임 방 생성을 처리하는 서비스 클래스입니다.
 *
 * 주요 역할:
 * 1. 사용자의 유효성을 검증하고 존재 여부를 확인합니다.
 * 2. 사용자가 중복으로 방에 참여 중인지 확인합니다.
 * 3. 새로운 게임 방을 생성하고 저장합니다.
 * 4. 방장을 게임 방의 첫 번째 참가자로 등록합니다.
 * 5. 생성된 게임 방의 정보를 응답으로 반환합니다.
 *
 * 사용자가 게임 방을 생성하려는 요청을 처리하며, 필요한 경우 예외를 발생시켜
 * 무결성을 보장합니다.
 *
 * @author 강관주
 * @since 2025-10-13
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class CreateRoomService {

    private final UserRepository userRepository;
    private final GameRoomRepository gameRoomRepository;
    private final GameParticipantRepository gameParticipantRepository;

    public CreateRoomResponse createRoom(CreateRoomRequest request, Long userId) {

        // 1. 사용자 조회
        User hostUser = userRepository.findById(userId)
                .orElseThrow(() -> {
                    log.error("사용자를 찾을 수 없습니다. userId={}", userId);
                    return new BusinessException(ErrorCode.USER_NOT_FOUND);
                });

        // 2. 중복 참여 검증 - 이미 WAITING이나 IN_PROGRESS 상태의 방에 참여 중인지 확인
        boolean alreadyInRoom = gameParticipantRepository.existsByParticipantAndGameRoom_StatusIn(
                hostUser,
                GameRoomStatus.WAITING,
                GameRoomStatus.IN_PROGRESS
        );

        if (alreadyInRoom) {
            log.warn("이미 다른 방에 참여 중입니다. userId={}", userId);
            throw new BusinessException(ErrorCode.PARTICIPANT_ALREADY_IN_ROOM);
        }

        // 3. 게임 방 생성
        GameRoom gameRoom = GameRoom.builder()
                .gameTitle(request.getGameTitle())
                .host(hostUser)
                .status(GameRoomStatus.WAITING)
                .build();

        GameRoom savedRoom = gameRoomRepository.save(gameRoom);

        // 4. 방장을 첫 번째 참가자로 등록
        GameParticipant hostParticipant = GameParticipant.builder()
                .gameRoom(savedRoom)
                .participant(hostUser)
                .isHost(true)
                .build();

        gameParticipantRepository.save(hostParticipant);

        log.info("게임 방이 생성되었습니다. roomId={}, hostId={}, title={}",
                savedRoom.getId(), userId, request.getGameTitle());

        // 5. 응답 생성
        return CreateRoomResponse.from(savedRoom.getId());
    }
}
