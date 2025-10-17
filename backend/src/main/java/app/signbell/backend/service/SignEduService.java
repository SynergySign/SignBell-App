package app.signbell.backend.service;

import app.signbell.backend.dto.response.signEdu.SignDetailResponseDto;
import app.signbell.backend.dto.response.signEdu.SignSimpleResponseDto;
import app.signbell.backend.entity.Sign;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.SignRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 수어 학습 콘텐츠 조회 관련 비즈니스 로직을 처리하는 서비스입니다.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true) // 조회 기능이므로 readOnly = true 설정
public class SignEduService {

    private final SignRepository signRepository;

    /**
     * 등록된 모든 카테고리(태그) 목록을 중복 없이 조회합니다.
     * @return 카테고리 문자열 리스트
     */
    public List<String> findAllCategoryTypes() {
        // SignRepositoryImpl의 findAllTags() 메서드를 호출합니다.
        // 내부적으로 categoryType을 조회합니다.
        return signRepository.findAllTags();
    }

    /**
     * 모든 수어 단어 또는 특정 카테고리의 수어 단어 목록을 페이징하여 조회합니다.
     * @param categoryType 조회할 카테고리명 (null이나 빈 문자열일 경우 전체 조회)
     * @param pageable 페이징 정보
     * @return SignSimpleResponseDto의 Page 객체
     */
    public Page<SignSimpleResponseDto> findSigns(String categoryType, Pageable pageable) {
        Page<Sign> signsPage;

        // categoryType 값이 있으면 카테고리별 조회, 없으면 전체 조회
        if (StringUtils.hasText(categoryType)) {
            signsPage = signRepository.findByCategoryType(categoryType, pageable);
        } else {
            signsPage = signRepository.findAll(pageable);
        }

        // Page<Sign>을 Page<SignSimpleResponseDto>로 변환
        return signsPage.map(sign -> SignSimpleResponseDto.builder()
                .signId(sign.getId())
                .wordName(sign.getTitle())
                .build());
    }

    /**
     * ID를 통해 단일 수어 단어의 상세 정보를 조회합니다.
     * @param signId 조회할 단어의 ID
     * @return SignDetailResponseDto
     */
    public SignDetailResponseDto findSignById(Long signId) {
        Sign sign = signRepository.findById(signId)
                .orElseThrow(() -> new BusinessException(ErrorCode.WORD_NOT_FOUND));

        return SignDetailResponseDto.builder()
                .signId(sign.getId())
                .wordName(sign.getTitle())
                .description(sign.getSignDescription()) // 상세 설명 필드 사용
                .videoUrl(sign.getUrl())
                .tag(sign.getCategoryType())
                .build();
    }
}