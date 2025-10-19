package app.signbell.backend.service;

import app.signbell.backend.dto.response.RoomDetailResponse;
import app.signbell.backend.dto.response.RoomListResponse;
import app.signbell.backend.dto.response.RoomListSliceResponse;
import app.signbell.backend.entity.GameRoom;
import app.signbell.backend.entity.GameRoomStatus;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.GameRoomRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * RoomListService는 게임 방 리스트를 조회하는 기능을 제공합니다.
 * 이 서비스를 통해 대기 상태의 게임 방 목록을 페이징 처리하여 가져올 수 있습니다.
 *
 * 주요 기능:
 * - 게임 방 목록 조회
 * - 특정 게임 방 상세 정보 조회
 * - 페이지 크기 유효성 검사 및 기본값 설정
 *
 * 의존성:
 * - GameRoomRepository: 대기 상태의 게임 방 정보를 데이터베이스에서 조회하기 위한 Repository
 *
 * 트랜잭션:
 * - 읽기 전용(readOnly = true) 트랜잭션 설정
 *
 * @author 강관주
 * @since 2025-10-13
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class RoomListService {

    private final GameRoomRepository gameRoomRepository;

    /**
     * 주어진 페이지 번호와 페이지 크기를 기반으로 대기 상태의 게임 방 목록을 조회합니다.
     * 조회된 결과는 페이징된 형태의 응답으로 반환됩니다.
     *
     * @param page 조회할 페이지 번호 (0부터 시작)
     * @param size 한 페이지에 조회할 방의 개수 (1 이상 100 이하)
     * @return 대기 상태의 게임 방 목록과 다음 페이지 존재 여부 정보를 포함한 응답 객체
     */
    public RoomListSliceResponse getRoomList(int page, int size) {

        // 페이지 크기 검증
        if (size < 1 || size > 100) {
            log.warn("유효하지 않은 페이지 크기: {}, 기본값 10으로 설정", size);
            size = 10;
        }

        // Pageable 생성
        Pageable pageable = PageRequest.of(page, size);

        // WAITING 상태의 방 목록 조회
        Slice<GameRoom> roomSlice = gameRoomRepository.findWaitingRooms(pageable);

        // Entity -> DTO 변환
        List<RoomListResponse> rooms = roomSlice.getContent()
                .stream()
                .map(RoomListResponse::from)
                .collect(Collectors.toList());

        log.info("방 목록 조회 완료. page={}, size={}, 조회된 방 개수={}, hasNext={}",
                page, size, roomSlice.getContent().size(), roomSlice.hasNext());

        // Slice 응답 생성
        return RoomListSliceResponse.from(rooms, roomSlice.hasNext());
    }

    /**
     * 특정 게임 방의 상세 정보를 조회합니다.
     * FINISHED 상태의 방은 조회되지 않습니다.
     *
     * @param roomId 조회할 방의 ID
     * @return 게임 방의 상세 정보를 담은 응답 객체
     * @throws BusinessException 해당 ID의 방이 존재하지 않거나 FINISHED 상태인 경우 ROOM_NOT_FOUND 예외 발생
     */
    public RoomDetailResponse getRoomDetail(Long roomId) {
        GameRoom gameRoom = gameRoomRepository.findById(roomId)
                .orElseThrow(() -> {
                    log.warn("방을 찾을 수 없습니다. roomId={}", roomId);
                    return new BusinessException(ErrorCode.ROOM_NOT_FOUND);
                });

        // FINISHED 상태인 방은 조회 불가
        if (gameRoom.getStatus() == GameRoomStatus.FINISHED) {
            log.warn("종료된 방은 조회할 수 없습니다. roomId={}, status={}", roomId, gameRoom.getStatus());
            throw new BusinessException(ErrorCode.ROOM_NOT_FOUND);
        }

        log.info("방 상세 정보 조회 완료. roomId={}, gameTitle={}, status={}",
                roomId, gameRoom.getGameTitle(), gameRoom.getStatus());

        return RoomDetailResponse.from(gameRoom);
    }
}
