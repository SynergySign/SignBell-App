package app.signbell.backend.service;


import app.signbell.backend.dto.response.userData.UserInfoResponse;
import app.signbell.backend.dto.response.userData.UserResponse;
import app.signbell.backend.entity.User;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class UserService {

    private final UserRepository usersRepository;

    /**
     * 주어진 userId를 이용하여 사용자의 정보를 조회하고 반환합니다.
     *
     * @param id 사용자를 식별하는 userId (일반적으로 Long 타입)
     * @return 조회된 사용자의 정보를 담고 있는 UserInfoResponse 객체
     * @throws BusinessException 사용자가 존재하지 않을 경우 예외를 발생시킵니다.
     *
     * @author 송민재
     * @since 2025-10-20
     */
    @Transactional(readOnly = true)
    public UserInfoResponse findMeById(Long id) { // 메서드 이름과 매개변수 타입 변경
        // 사용자 정보 조회
        log.info("providerId: {}", id);
        User user = (User) usersRepository.findById(id) // 메서드 호출 변경
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        return UserInfoResponse.from(user);
    }

    /**

     * @param providerId
     * @return 로그인된 유저 id
     *
     * @author 송민재
     * @since 2025-09-16
     */
    @Transactional(readOnly = true)
    public Long getUserIdByProviderId(String providerId) {

        User user = usersRepository.findByProviderId(providerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        return user.getId();
    }

    /**
     * 주어진 providerId를 기반으로 사용자를 조회하여 필수 동의 상태를 업데이트하고,
     * 업데이트된 사용자 정보를 반환합니다.
     *
     * 더티 체킹(Dirty Checking):
     * '@Transactional' 안에서 영속성 컨텍스트에 의해 관리되는 엔티티의 상태가 변경되면
     * 별도의 'save' 메서드 호출 없이도 JPA가 알아서 변경된 내용을 데이터베이스에 동기화(synchronize)해 줍니다.
     *
     * @param providerId 사용자를 식별하기 위한 providerId
     * @return 업데이트된 사용자 정보를 포함하는 UserResponse 객체
     * @throws BusinessException 사용자가 존재하지 않을 경우 예외를 발생시킵니다.
     *
     * @author 송민재
     * @since 2025-10-20
     */
    /**
     * 주어진 userId를 기반으로 사용자를 조회하여 약관 동의 상태를 업데이트하고,
     * 업데이트된 사용자 정보를 반환합니다.
     *
     * @param userId 사용자를 식별하기 위한 userId
     * @return 업데이트된 사용자 정보를 포함하는 UserResponse 객체
     * @throws BusinessException 사용자가 존재하지 않을 경우 예외를 발생시킵니다.
     *
     * @author 송민재
     * @since 2025-10-30
     */
    public UserResponse updateUserAgreement(Long userId, Boolean requiredAgree, Boolean optionalAgree) {
        log.info("Updating agreement for userId: {}, requiredAgree: {}, optionalAgree: {}", 
                userId, requiredAgree, optionalAgree);
        
        // 사용자 정보 조회
        User user = usersRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // 필수 약관 동의 상태 업데이트 (null이 아닌 경우에만)
        if (requiredAgree != null && requiredAgree) {
            user.updateRequiredAgreement();
        }
        
        // 선택 약관 동의 상태 업데이트 (null이 아닌 경우에만)
        user.updateOptionalAgreement(optionalAgree);
        
        // 더티 체킹으로 자동 저장됨 (@Transactional)
        log.info("Agreement updated for userId: {}, requiredAgree: {}, optionalAgree: {}", 
                userId, user.getRequiredAgree(), user.getOptionalAgree());

        return UserResponse.from(user);
    }

    /**
     * 개인학습 데이터 제공 시 10점 지급
     */
    @Transactional
    public UserResponse addLearningReward(Long userId) {
        User user = usersRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        
        user.updateTotalScore(10);
        
        log.info("Learning reward added for userId: {}, new totalScore: {}", userId, user.getTotalScore());
        
        return UserResponse.from(user);
    }
}
