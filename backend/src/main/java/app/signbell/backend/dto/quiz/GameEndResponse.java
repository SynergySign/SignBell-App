package app.signbell.backend.dto.quiz;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * 게임 종료 응답 DTO
 * 
 * 게임 종료 시 순위 발표 화면에 표시할 정보
 * - 사용자가 "방으로 돌아가기" 버튼을 클릭하면 대기실로 이동
 * 
 * @author 고동현
 * @since 2025-10-17
 */
@Getter
@Builder
public class GameEndResponse {
    private String eventType;           // "QUIZ_FINISHED"
    private Integer completedRound;     // 완료된 라운드 번호
    private Integer nextRound;          // 다음 라운드 번호
    private List<RankingInfo> rankings; // 순위 정보 (이번 라운드 점수 기준)
    private Boolean showReturnButton;   // "방으로 돌아가기" 버튼 표시 여부
}
