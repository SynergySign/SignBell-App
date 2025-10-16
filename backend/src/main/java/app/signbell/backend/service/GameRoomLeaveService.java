package app.signbell.backend.service;

import app.signbell.backend.dto.response.ParticipantEventResponse;
import app.signbell.backend.dto.response.ParticipantResponse;
import app.signbell.backend.entity.GameParticipant;
import app.signbell.backend.entity.GameRoom;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.GameParticipantRepository;
import app.signbell.backend.repository.GameRoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 게임방 퇴장(나가기) 기능을 처리하는 서비스 클래스입니다.
 *
 * 주요 역할:
 * - 사용자가 현재 참여 중인 게임방에서 퇴장 처리
 * - 참가자 정보 삭제 및 방의 현재 참가자 수 감소
 * - 퇴장 이벤트 정보 생성 및 반환 (웹소켓으로 브로드캐스트하기 위한 데이터)
 *
 * @Transactional: 메서드 실행 중 오류 발생 시 자동 롤백 처리
 *
 * @author 강관주
 * @since 2025-10-16
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class GameRoomLeaveService {

    // 게임 참가자 정보를 조회/수정/삭제하는 레포지토리
    private final GameParticipantRepository participantRepository;

    // 게임방 정보를 조회/수정하는 레포지토리
    private final GameRoomRepository gameRoomRepository;

    /**
     * 사용자 ID로 현재 참여 중인 게임방에서 퇴장 처리
     *
     * 사용 시나리오:
     * - 사용자가 어느 방에 있는지 모를 때 사용
     * - 사용자 ID만으로 자동으로 현재 방을 찾아서 퇴장 처리
     *
     * 동작 과정:
     * 1. userId로 GameParticipant 엔티티 조회
     * 2. 찾은 참가자 정보에서 gameRoomId 추출
     * 3. leaveRoom() 메서드 호출하여 실제 퇴장 처리
     *
     * @param userId 퇴장할 사용자의 ID
     * @return ParticipantEventResponse 퇴장 이벤트 정보
     *         - eventType: "PARTICIPANT_LEFT"
     *         - participant: 퇴장한 사용자 정보
     *         - currentParticipants: 퇴장 후 남은 참가자 수
     *         - gameRoomId: 퇴장한 게임방 ID
     * @throws BusinessException 해당 사용자가 어떤 방에도 참여하지 않은 경우
     *                          (ErrorCode.PARTICIPANT_NOT_IN_ROOM)
     */
    public ParticipantEventResponse leaveCurrentRoomByUser(Long userId) {
        // 1. 사용자가 현재 참여 중인 방 정보 조회
        GameParticipant participant = participantRepository
                .findByParticipant_Id(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARTICIPANT_NOT_IN_ROOM));

        // 2. 참가자 정보에서 게임방 ID 추출
        Long roomId = participant.getGameRoom().getId();

        // 3. 실제 퇴장 처리 수행
        return leaveRoom(userId, roomId);
    }

    /**
     * 특정 게임방에서 사용자를 퇴장 처리하는 핵심 메서드
     *
     * 사용 시나리오:
     * - 특정 방 ID와 사용자 ID를 알고 있을 때 사용
     * - 명확한 방에서 특정 사용자를 퇴장시킬 때
     *
     * 동작 과정:
     * 1. gameRoomId와 userId로 GameParticipant 엔티티 조회
     * 2. 삭제 전에 응답용 데이터(ParticipantResponse) 미리 생성
     *    → 중요: 엔티티 삭제 후에는 데이터 접근 불가능하므로 먼저 생성
     * 3. 참가자 정보 DB에서 삭제
     * 4. 게임방의 현재 참가자 수 감소 (decrementParticipants)
     * 5. 업데이트된 게임방 정보 저장
     * 6. 퇴장 이벤트 응답 객체 생성 및 반환
     *
     * @param userId 퇴장할 사용자의 ID
     * @param gameRoomId 퇴장 대상 게임방의 ID
     * @return ParticipantEventResponse 퇴장 이벤트 정보
     *         이 정보는 주로 웹소켓을 통해 같은 방의 다른 참가자들에게 전송됨
     * @throws BusinessException 해당 방에 해당 사용자가 참여하지 않은 경우
     *                          (ErrorCode.PARTICIPANT_NOT_IN_ROOM)
     */
    public ParticipantEventResponse leaveRoom(Long userId, Long gameRoomId) {
        // 1. 퇴장 시작 로그 기록
        log.info("User {} leaving room {}", userId, gameRoomId);

        // 2. 특정 방의 특정 사용자 참가 정보 조회
        //    JOIN FETCH로 participant와 gameRoom을 함께 로딩 (N+1 문제 방지)
        GameParticipant participant = participantRepository
                .findByGameRoom_IdAndParticipant_Id(gameRoomId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARTICIPANT_NOT_IN_ROOM));

        // 3. 응답 데이터 미리 생성 (중요!)
        //    삭제 전에 생성해야 participant 엔티티의 데이터를 사용 가능
        //    ParticipantResponse.from()은 userId, nickname 등을 DTO로 변환
        ParticipantResponse participantResponse = ParticipantResponse.from(participant);

        // 4. 게임방 엔티티 참조 저장
        GameRoom room = participant.getGameRoom();

        // 5. 참가자 정보 삭제
        //    game_participant 테이블에서 해당 레코드 삭제
        participantRepository.delete(participant);

        // 6. 게임방의 현재 참가자 수 감소
        //    GameRoom 엔티티의 currentParticipants 값을 1 감소
        room.decrementParticipants();

        // 7. 업데이트된 게임방 정보 저장
        gameRoomRepository.save(room);

        // 8. 퇴장 완료 로그 기록 (현재 남은 참가자 수 포함)
        log.info("User {} left room {}. currentParticipants={}", userId, gameRoomId, room.getCurrentParticipants());

        // 9. 퇴장 이벤트 응답 객체 생성 및 반환
        //    이 객체는 주로 WebSocket을 통해 같은 방의 다른 참가자들에게 브로드캐스트됨
        //    다른 참가자들은 이 정보로 "누가 나갔는지", "현재 몇 명이 남았는지" 알 수 있음
        return ParticipantEventResponse.builder()
                .eventType("PARTICIPANT_LEFT")           // 이벤트 타입: 참가자 퇴장
                .participant(participantResponse)         // 퇴장한 사용자 정보
                .currentParticipants(room.getCurrentParticipants())  // 남은 참가자 수
                .gameRoomId(room.getId())                    // 게임방 ID
                .build();
    }
}