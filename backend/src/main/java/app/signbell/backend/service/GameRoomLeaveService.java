package app.signbell.backend.service;

import app.signbell.backend.dto.response.ParticipantEventResponse;
import app.signbell.backend.dto.response.ParticipantResponse;
import app.signbell.backend.entity.GameParticipant;
import app.signbell.backend.entity.GameRoom;
import app.signbell.backend.entity.GameRoomStatus;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.GameParticipantRepository;
import app.signbell.backend.repository.GameRoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 게임방 퇴장(나가기) 기능을 처리하는 서비스 클래스입니다.
 *
 * 주요 역할:
 * - 사용자가 현재 참여 중인 게임방에서 퇴장 처리
 * - 참가자 정보 삭제 및 방의 현재 참가자 수 감소
 * - 방장 퇴장 시 방 종료 처리 (모든 참가자 제거, 방 상태 변경)
 * - 방 종료 시 남은 참가자들의 세션 정리 위임
 * - 퇴장 이벤트 정보 생성 및 반환 (웹소켓으로 브로드캐스트하기 위한 데이터)
 *
 * @Transactional: 메서드 실행 중 오류 발생 시 자동 롤백 처리
 *
 * @author 강관주
 * @since 2025-10-16
 */
@Service
@Slf4j
public class GameRoomLeaveService {

    private final GameParticipantRepository participantRepository;
    private final GameRoomRepository gameRoomRepository;
    private final WebSocketSessionService sessionService;
    private final QuizStateCache quizStateCache;
    private final QuizService quizService;


    public GameRoomLeaveService(
            GameParticipantRepository participantRepository,
            GameRoomRepository gameRoomRepository,
            @Lazy WebSocketSessionService sessionService,
            QuizStateCache quizStateCache,
            @Lazy QuizService quizService
    ) {
        this.participantRepository = participantRepository;
        this.gameRoomRepository = gameRoomRepository;
        this.sessionService = sessionService;
        this.quizStateCache = quizStateCache;
        this.quizService = quizService;
    }

    /**
     * 사용자 ID로 현재 참여 중인 게임방에서 퇴장 처리
     *
     * 사용 시나리오:
     * - 사용자가 어느 방에 있는지 모를 때 사용
     * - 사용자 ID만으로 자동으로 현재 방을 찾아서 퇴장 처리
     *
     * 동작 과정:
     * 1. userId로 GameParticipant 엔티티 조회
     * 2. leaveRoom() 메서드 호출하여 실제 퇴장 처리
     *
     * @param userId 퇴장할 사용자의 ID
     * @return ParticipantEventResponse 퇴장 이벤트 정보
     *         - eventType: "PARTICIPANT_LEFT" (일반 참가자) 또는 "ROOM_CLOSED" (방장)
     *         - participant: 퇴장한 사용자 정보
     *         - currentParticipants: 퇴장 후 남은 참가자 수
     *         - gameRoomId: 퇴장한 게임방 ID
     *         - roomClosed: 방 종료 여부 (방장 퇴장 시 true)
     * @throws BusinessException 해당 사용자가 어떤 방에도 참여하지 않은 경우
     *                          (ErrorCode.PARTICIPANT_NOT_IN_ROOM)
     */
    @Transactional
    public ParticipantEventResponse leaveCurrentRoomByUser(Long userId) {
        // 1. 사용자가 현재 참여 중인 방 정보 조회
        //    GameRoom과 GameParticipant 정보를 함께 fetch하여 N+1 문제 방지
        GameParticipant participant = participantRepository
                .findByParticipant_Id(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARTICIPANT_NOT_IN_ROOM));

        // 2. 실제 퇴장 처리 수행
        return leaveRoom(participant);
    }

    /**
     * 조회된 GameParticipant 엔티티를 받아 퇴장 처리하는 핵심 로직 메서드
     *
     * 이 메서드는 실제 퇴장 처리를 담당합니다.
     *
     * @param participant 이미 조회된 GameParticipant 엔티티
     * @return ParticipantEventResponse 퇴장 이벤트 정보
     */
    private ParticipantEventResponse leaveRoom(GameParticipant participant) {
        Long userId = participant.getParticipant().getId();
        GameRoom room = participant.getGameRoom();
        Long gameRoomId = room.getId();

        // 1. 퇴장 시작 로그 기록
        log.info("User {} leaving room {}", userId, gameRoomId);

        // 2. 응답 데이터 미리 생성 (중요!)
        //    삭제 전에 생성해야 participant 엔티티의 데이터를 사용 가능
        //    ParticipantResponse.from()은 userId, nickname 등을 DTO로 변환
        ParticipantResponse participantResponse = ParticipantResponse.from(participant);

        // 3. 방장 여부 확인
        //    방장이면 방 종료 처리, 일반 참가자면 본인만 퇴장 처리
        boolean isHost = participant.isHost();

        // 4-1. 방장이 퇴장하는 경우: 방 종료 처리
        if (isHost) {
            return handleHostLeave(room, participantResponse);
        }

        // 4-2. 일반 참가자가 퇴장하는 경우: 본인만 제거
        return handleParticipantLeave(participant, room, participantResponse, userId, gameRoomId);
    }

    /**
     * 방장 퇴장 시 방 종료 처리
     *
     * 동작 과정:
     * 1. 방장 제외한 다른 참가자들의 userId 목록 조회
     * 2. 남은 모든 참가자를 Bulk Delete로 한 번에 삭제
     * 3. 방 종료 처리 (상태 변경 및 참가자 수 초기화)
     * 4. 업데이트된 방 정보 저장
     * 5. 남은 참가자들의 세션 정리 (WebSocketSessionService에 위임)
     * 6. 방 종료 이벤트 응답 생성 및 반환
     *
     * @param room 종료할 게임방
     * @param hostResponse 퇴장하는 방장의 정보
     * @return ParticipantEventResponse 방 종료 이벤트 정보
     */
    private ParticipantEventResponse handleHostLeave(GameRoom room, ParticipantResponse hostResponse) {
        Long roomId = room.getId();

        log.info("방장 퇴장 감지 - 방 종료 처리 시작. roomId: {}", roomId);

        // 1. 방장 제외한 다른 참가자들의 userId 목록 조회
        List<Long> otherParticipantUserIds = participantRepository
                .findByGameRoom_Id(roomId)
                .stream()
                .filter(p -> !p.isHost())
                .map(p -> p.getParticipant().getId())
                .toList();

        log.info("방 종료 대상 참가자 수: {}", otherParticipantUserIds.size());

        // 2. 남은 모든 참가자를 한 번의 쿼리로 삭제 (Bulk Delete)
        int deletedCount = participantRepository.deleteAllByGameRoom(room);
        log.info("방 종료 시 제거된 참가자 수: {}", deletedCount);

        // 3. 방 종료 처리
        room.closeRoom();

        // 4. 업데이트된 방 정보 저장
        gameRoomRepository.save(room);

        // 5. 남은 참가자들의 세션 정리
        //    트랜잭션이 커밋되기 전이지만, 이미 DB에서 삭제되었으므로
        //    세션 정리는 바로 수행해도 안전합니다.
        if (!otherParticipantUserIds.isEmpty()) {
            sessionService.cleanupMultipleSessions(otherParticipantUserIds, roomId);
        }

        log.info("방장 퇴장으로 방 종료 완료 - roomId: {}, 제거된 참가자 수: {}",
                roomId, deletedCount);

        // 6. 방 종료 이벤트 응답 객체 생성 및 반환
        return ParticipantEventResponse.builder()
                .eventType("ROOM_CLOSED")
                .participant(hostResponse)
                .currentParticipants(0)
                .gameRoomId(roomId)
                .roomClosed(true)
                .build();
    }

    /**
     * 일반 참가자 퇴장 처리
     *
     * 동작 과정:
     * 1. 해당 참가자 정보 삭제
     * 2. 방의 현재 참가자 수 감소
     * 3. 게임 진행 중이면 캐시에서 해당 유저 제거
     * 4. 업데이트된 방 정보 저장
     * 5. 참가자 퇴장 이벤트 응답 생성 및 반환
     *
     * @param participant 퇴장하는 참가자 엔티티
     * @param room 참가자가 속한 게임방
     * @param participantResponse 퇴장하는 참가자의 정보
     * @param userId 퇴장하는 사용자 ID (로깅용)
     * @param gameRoomId 게임방 ID (로깅용)
     * @return ParticipantEventResponse 참가자 퇴장 이벤트 정보
     */
    private ParticipantEventResponse handleParticipantLeave(
            GameParticipant participant,
            GameRoom room,
            ParticipantResponse participantResponse,
            Long userId,
            Long gameRoomId
    ) {
        // 1. 참가자 정보 삭제
        //    game_participant 테이블에서 해당 레코드 삭제
        participantRepository.delete(participant);

        // 2. 게임방의 현재 참가자 수 감소
        //    GameRoom 엔티티의 currentParticipants 값을 1 감소
        room.decrementParticipants();

        // 3. 게임 진행 중이면 캐시에서 해당 유저 제거 및 다음 도전자 확인
        Long nextChallengerId = null;
        log.info("🔍 방 상태 확인 - roomId: {}, status: {}", gameRoomId, room.getStatus());
        
        if (room.getStatus() == GameRoomStatus.IN_PROGRESS) {
            log.info("🎮 게임 진행 중 - 다음 도전자 확인 시작");
            nextChallengerId = handleGameInProgressLeave(gameRoomId, userId);
            log.info("🎮 다음 도전자 확인 완료 - nextChallengerId: {}", nextChallengerId);
        } else {
            log.info("⏸️ 게임 진행 중 아님 - 다음 도전자 확인 생략");
        }

        // 4. 업데이트된 게임방 정보 저장
        gameRoomRepository.save(room);

        // 5. 퇴장 완료 로그 기록 (현재 남은 참가자 수 포함)
        log.info("User {} left room {}. currentParticipants={}, nextChallengerId={}",
                userId, gameRoomId, room.getCurrentParticipants(), nextChallengerId);

        // 6. 참가자 퇴장 이벤트 응답 객체 생성 및 반환
        //    이 객체는 주로 WebSocket을 통해 같은 방의 다른 참가자들에게 브로드캐스트됨
        //    다른 참가자들은 이 정보로 "누가 나갔는지", "현재 몇 명이 남았는지" 알 수 있음
        ParticipantEventResponse response = ParticipantEventResponse.builder()
                .eventType("PARTICIPANT_LEFT")
                .participant(participantResponse)
                .currentParticipants(room.getCurrentParticipants())
                .gameRoomId(room.getId())
                .roomClosed(false)
                .nextChallengerId(nextChallengerId)
                .build();
        
        log.info("📤 PARTICIPANT_LEFT 이벤트 생성 완료 - nextChallengerId: {}", response.getNextChallengerId());
        return response;
    }

    /**
     * 게임 진행 중 참가자 퇴장 시 처리
     * 
     * 처리 내용:
     * 1. QuizService.handleParticipantLeft 호출하여 타이머 재시작 처리
     * 2. 캐시에서 해당 유저의 점수 제거
     * 3. 모든 문제에서 해당 유저의 도전 순서 제거
     * 
     * @param roomId 게임방 ID
     * @param userId 퇴장한 사용자 ID
     * @return 다음 도전자 정보 (없으면 null)
     */
    private Long handleGameInProgressLeave(Long roomId, Long userId) {
        try {
            log.info("🎮 게임 진행 중 퇴장 처리 시작 - roomId: {}, userId: {}", roomId, userId);
            
            // 1. QuizService에 퇴장 처리 위임 (타이머 재시작 포함)
            quizService.handleParticipantLeft(roomId, userId);
            log.info("✅ QuizService.handleParticipantLeft 호출 완료 - roomId: {}, userId: {}", roomId, userId);
            
            QuizStateCache.GameRoomState roomState = quizStateCache.getOrCreateRoomState(roomId);
            
            // 2. 캐시에서 점수 제거
            roomState.removeUserScore(userId);
            log.info("게임 중 퇴장 - 캐시에서 점수 제거: userId={}, roomId={}", userId, roomId);
            
            Long nextChallengerId = null;
            
            // 3. 모든 문제(1~8)에서 해당 유저의 도전 순서 제거
            for (int questionNumber = 1; questionNumber <= 8; questionNumber++) {
                // 현재 도전 차례인지 확인
                Long currentChallenger = roomState.getCurrentChallenger(questionNumber);
                boolean wasCurrentChallenger = userId.equals(currentChallenger);
                
                if (wasCurrentChallenger) {
                    // 현재 도전자였다면 다음 도전자 ID 저장 (이미 QuizService에서 처리됨)
                    Long nextChallenger = roomState.getCurrentChallenger(questionNumber);
                    if (nextChallenger != null && !nextChallenger.equals(userId)) {
                        nextChallengerId = nextChallenger;
                        log.info("게임 중 퇴장 - 다음 도전자 확인: question={}, 퇴장userId={}, 다음userId={}", 
                                questionNumber, userId, nextChallenger);
                    }
                } else {
                    // 현재 도전자가 아니면 그냥 제거만
                    roomState.removeChallenger(questionNumber, userId);
                }
            }
            
            log.info("게임 중 퇴장 처리 완료 - userId={}, roomId={}, nextChallengerId={}", 
                    userId, roomId, nextChallengerId);
            
            return nextChallengerId;
            
        } catch (Exception e) {
            log.error("게임 중 퇴장 처리 실패 - userId={}, roomId={}", userId, roomId, e);
            return null;
        }
    }
}