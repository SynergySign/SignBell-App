package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/**
 * RoomListSliceResponse 클래스는 게임 방 목록에 대한 페이징된 응답 객체를 표현합니다.
 *
 * 이 클래스는 게임 방 정보의 리스트와 다음 페이지의 존재 여부를 포함합니다.
 * 주로 페이징 처리된 게임 방 목록을 반환하는 데 사용됩니다.
 *
 * 주요 필드:
 * - roomList: RoomListResponse 객체의 리스트로, 각 게임 방의 정보를 포함
 * - hasNext: 다음 페이지 존재 여부를 나타내는 불리언 값
 *
 * 주요 메서드:
 * - static RoomListSliceResponse from(List<RoomListResponse> rooms, Boolean hasNext):
 *   주어진 RoomListResponse 리스트와 다음 페이지 존재 여부 플래그를 기반으로 RoomListSliceResponse 객체를 생성합니다.
 *
 * @author 강관주
 * @since 2025-10-13
 */
@Getter
@AllArgsConstructor
public class RoomListSliceResponse {

    private List<RoomListResponse> roomList;

    private Boolean hasNext;

    public static RoomListSliceResponse from(List<RoomListResponse> rooms, Boolean hasNext) {
        return new RoomListSliceResponse(rooms, hasNext);
    }
}