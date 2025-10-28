package app.signbell.backend.controller.user;

import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.dto.response.userData.UserRankResponse;
import app.signbell.backend.service.RankListService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 사용자 랭킹 조회 API를 제공하는 컨트롤러 클래스입니다.
 * 
 * 이 클래스는 누적 점수(totalScore)를 기준으로 상위 8명의 사용자 랭킹을 조회하는 기능을 제공합니다.
 * 랭킹 데이터는 RankListService를 통해 조회되며, ApiResponse 형식으로 래핑되어 반환됩니다.
 * 
 * 사용되는 주요 엔드포인트:
 * - GET /api/users/rank: 상위 8명의 사용자 랭킹 조회
 * 
 * 에러 처리:
 * 비즈니스 로직에서 발생하는 예외는 GlobalExceptionHandler를 통해 ErrorResponse 형식으로 변환됩니다.
 * 
 * @author 강관주
 * @since 2025-10-28
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class RankController {

    private final RankListService rankListService;

    /**
     * 상위 8명의 사용자 랭킹을 조회합니다.
     * 
     * 누적 점수(totalScore)를 기준으로 내림차순 정렬된 상위 8명의 사용자 정보를 반환합니다.
     * 각 사용자의 순위, 닉네임, 점수, 프로필 이미지 정보가 포함됩니다.
     * 
     * @return ResponseEntity<ApiResponse<List<UserRankResponse>>> 랭킹 데이터를 포함한 API 응답
     */
    @GetMapping("/rank")
    public ResponseEntity<ApiResponse<List<UserRankResponse>>> getRankings() {
        log.info("GET /api/users/rank - 랭킹 조회 요청");
        
        List<UserRankResponse> rankings = rankListService.getTopRankings();
        
        log.info("GET /api/users/rank - 랭킹 조회 성공: {} 명", rankings.size());
        
        ApiResponse<List<UserRankResponse>> response = ApiResponse.success(
            "랭킹 조회에 성공했습니다.",
            rankings
        );
        
        return ResponseEntity.ok(response);
    }
}
