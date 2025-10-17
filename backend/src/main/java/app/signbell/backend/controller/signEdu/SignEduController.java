package app.signbell.backend.controller.signEdu;

import app.signbell.backend.dto.response.signEdu.SignDetailResponseDto;
import app.signbell.backend.dto.response.signEdu.SignSimpleResponseDto;
import app.signbell.backend.service.SignEduService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 수어 학습 콘텐츠 조회 API를 제공하는 컨트롤러입니다.
 */
@RestController
@RequestMapping("/api/sign-edu")
@RequiredArgsConstructor
public class SignEduController {

    private final SignEduService signEduService;

    /**
     * 모든 카테고리 목록을 조회하는 API
     * @return 카테고리 문자열 리스트
     */
    @GetMapping("/categories")
    public ResponseEntity<List<String>> getAllCategoryTypes() {
        List<String> categoryTypes = signEduService.findAllCategoryTypes();
        return ResponseEntity.ok(categoryTypes);
    }

    /**
     * 모든 단어 또는 특정 카테고리의 단어 목록을 페이징하여 조회하는 API
     * @param category 카테고리명 (선택적 쿼리 파라미터)
     * @param pageable 페이징 정보
     *                 /api/sign-edu?category=삶
     *                 /api/sign-edu?category=삶&page=2
     * @return 단어 간략 정보의 Page 객체
     */
    @GetMapping
    public ResponseEntity<Page<SignSimpleResponseDto>> getSigns(
            @RequestParam(value = "category", required = false) String category,
            @PageableDefault(size = 20, sort = "title") Pageable pageable) {
        Page<SignSimpleResponseDto> signsPage = signEduService.findSigns(category, pageable);
        return ResponseEntity.ok(signsPage);
    }

    /**
     * 특정 단어의 상세 정보를 조회하는 API
     * @param signId 단어 ID (경로 변수)
     * @return 단어 상세 정보
     */
    @GetMapping("/{signId}")
    public ResponseEntity<SignDetailResponseDto> getSignDetails(
            @PathVariable("signId") Long signId) {
        SignDetailResponseDto signDetails = signEduService.findSignById(signId);
        return ResponseEntity.ok(signDetails);
    }
}