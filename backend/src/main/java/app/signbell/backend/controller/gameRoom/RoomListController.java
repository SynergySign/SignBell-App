package app.signbell.backend.controller.gameRoom;

import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.dto.response.RoomListSliceResponse;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.service.RoomListService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * RoomListController는 퀴즈 방 리스트를 관리하는 REST API의 컨트롤러 클래스입니다.
 * 클라이언트로부터 방 목록 조회 요청을 처리하며, 안전한 사용자 인증 및 요청 처리 로직을 포함하고 있습니다.
 *
 * 주요 기능:
 * - 사용자 인증 정보를 기반으로 퀴즈 방 목록을 페이징 처리하여 제공
 * - 인증 주체(subject)를 Long 타입 사용자 ID로 변환
 * - 요청 성공 및 실패에 따른 로깅 처리
 *
 * 요청 처리:
 * - GET 요청: "/api/quiz/rooms" 엔드포인트에 대해 방 목록을 조회
 * - 기본 페이징 매개변수: page=0, size=10
 *
 * 의존성:
 * - RoomListService: 방 목록 데이터를 조회하고 응답 객체를 생성하는 서비스
 *
 * 예외 처리:
 * - NumberFormatException: 인증된 사용자(subject)가 Long으로 변환되지 않을 경우 예외 처리 및 로그 기록
 * - 인증 예외 시, BusinessException을 던져 적절한 오류 응답 반환
 *
 * @author 강관주
 * @since 2025-10-13
 */
@RestController
@RequestMapping("/api/quiz/rooms")
@RequiredArgsConstructor
@Slf4j
public class RoomListController {

    private final RoomListService roomListService;

    /**
     * 퀴즈 방 목록을 조회하여 클라이언트에게 응답합니다.
     *
     * @param page 페이징 처리를 위한 페이지 번호, 기본값은 0
     * @param size 페이징 처리를 위한 페이지 당 데이터 수, 기본값은 10
     * @param subject 인증된 사용자의 ID를 나타내는 문자열 (JWT 토큰에서 추출된 주체)
     * @return 퀴즈 방 목록과 페이징 정보를 포함하는 응답 객체
     * @throws BusinessException 인증 주체(subject)가 Long 타입으로 변환되지 않을 경우 발생하며,
     *         이는 인증 오류로 간주됩니다.
     */
    @GetMapping
    public ResponseEntity<ApiResponse<RoomListSliceResponse>> getRoomList(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal String subject) {

        try {
            Long userId = Long.valueOf(subject); // subject(String)를 Long으로 변환

            log.info("방 리스트 조회 요청. userId={}, page={}, size={}", userId, page, size);

            RoomListSliceResponse response = roomListService.getRoomList(page, size);

            ApiResponse<RoomListSliceResponse> apiResponse =
                    ApiResponse.success("퀴즈 방 목록을 조회했습니다.", response);

            return ResponseEntity.ok(apiResponse);

        } catch (NumberFormatException e) {
            // 인증된 사용자(subject)는 숫자 형식이어야 하는데, 그렇지 않은 경우
            // 이는 보통 인증 시스템 설정 문제이거나, 예상치 못한 상황
            log.error("인증된 사용자 ID(subject)를 Long으로 변환하는 데 실패했습니다: {}", subject, e);
            throw new BusinessException(ErrorCode.UNAUTHORIZED); // 인증/변환 오류
        }
    }
}
