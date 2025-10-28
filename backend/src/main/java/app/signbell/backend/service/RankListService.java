package app.signbell.backend.service;

import app.signbell.backend.dto.response.userData.UserRankResponse;
import app.signbell.backend.entity.User;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * 사용자 랭킹 조회를 담당하는 서비스 클래스입니다.
 * 누적 점수(totalScore)를 기준으로 상위 8명의 사용자 랭킹을 조회하고,
 * UserRankResponse DTO로 변환하여 반환합니다.
 *
 * @author 강관주
 * @since 2025-10-28
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class RankListService {

    private final UserRepository userRepository;

    /**
     * 누적 점수를 기준으로 상위 8명의 사용자 랭킹을 조회합니다.
     * 조회된 User 엔티티를 UserRankResponse DTO로 변환하고 순위를 할당합니다.
     *
     * @return 상위 8명의 사용자 랭킹 리스트 (UserRankResponse)
     * @throws BusinessException 데이터베이스 조회 실패 시 발생
     */
    @Transactional(readOnly = true)
    public List<UserRankResponse> getTopRankings() {
        try {
            log.info("상위 랭킹 조회 시작");
            
            // UserRepository를 통해 상위 8명 조회
            List<User> topUsers = userRepository.findTop8ByOrderByTotalScoreDesc();
            
            // 빈 리스트 처리
            if (topUsers.isEmpty()) {
                log.info("조회된 사용자가 없습니다.");
                return new ArrayList<>();
            }
            
            // User 엔티티를 UserRankResponse DTO로 변환하고 순위 할당
            List<UserRankResponse> rankings = new ArrayList<>();
            for (int i = 0; i < topUsers.size(); i++) {
                User user = topUsers.get(i);
                int rank = i + 1; // 순위는 1부터 시작
                rankings.add(UserRankResponse.from(user, rank));
            }
            
            log.info("상위 랭킹 조회 완료: {} 명", rankings.size());
            return rankings;
            
        } catch (Exception e) {
            log.error("랭킹 조회 중 오류 발생", e);
            throw new BusinessException(ErrorCode.DATABASE_ERROR);
        }
    }
}
