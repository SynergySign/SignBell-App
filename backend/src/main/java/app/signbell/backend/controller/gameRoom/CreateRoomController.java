package app.signbell.backend.controller.gameRoom;

import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.dto.request.CreateRoomRequest;
import app.signbell.backend.dto.response.CreateRoomResponse;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.service.CreateRoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 게임 방 생성을 처리하는 컨트롤러 클래스.
 *
 * 이 클래스는 새로운 게임 방을 생성하는 데 필요한 REST API 엔드포인트를 제공합니다.
 * 클라이언트의 요청 데이터를 검증하고, 인증된 사용자의 정보를 바탕으로
 * 방 생성 로직을 실행합니다.
 *
 * 주요 역할:
 * 1. 클라이언트로부터 방 생성 요청을 접수.
 * 2. 요청 데이터를 기반으로 서비스 계층 호출.
 * 3. 성공 또는 오류에 대한 적절한 응답 반환.
 *
 * 요청 경로: "/api/quiz/rooms"
 *
 * @author 강관주
 * @since 2025-10-13
 */
@RestController
@RequestMapping("/api/quiz/rooms")
@RequiredArgsConstructor
@Slf4j
public class CreateRoomController {

    private final CreateRoomService createRoomService;

    /**
     * 새로운 게임 방을 생성하는 API 메서드.
     *
     * @param request 새로 생성할 방의 정보를 포함하는 객체. 유효성 검사가 적용되어 있음.
     * @param subject 로그인된 사용자의 ID. 인증 정보를 기반으로 제공됨.
     * @return 새롭게 생성된 방의 정보를 포함하는 응답 객체.
     */
    @PostMapping
    public ResponseEntity<ApiResponse<CreateRoomResponse>> createRoom(
            @Valid @RequestBody CreateRoomRequest request,
            @AuthenticationPrincipal String subject) {
        try {
            Long userId = Long.valueOf(subject); // subject(String)를 Long으로 변환
            CreateRoomResponse response = createRoomService.createRoom(request, userId);

            ApiResponse<CreateRoomResponse> apiResponse = ApiResponse.success("퀴즈 방이 성공적으로 생성되었습니다.", response);

            return ResponseEntity.ok(apiResponse);
        } catch (NumberFormatException e) {
            // 인증된 사용자(subject)는 숫자 형식이어야 하는데, 그렇지 않은 경우
            // 이는 보통 인증 시스템 설정 문제이거나, 예상치 못한 상황이므로,
            // 이를 BusinessException으로 감싸서 공통 예외 처리기에서 처리하게 합니다.
            log.error("인증된 사용자 ID(subject)를 Long으로 변환하는 데 실패했습니다: {}", subject, e);
            throw new BusinessException(ErrorCode.UNAUTHORIZED); // 인증/변환 오류
        }
    }
}
