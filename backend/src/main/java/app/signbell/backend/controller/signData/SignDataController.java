package app.signbell.backend.controller.signData;


import app.signbell.backend.dto.response.QuizWordUpdateResponse;
import app.signbell.backend.dto.response.signData.SignDataLoadResponseDto;
import app.signbell.backend.entity.Sign;
import app.signbell.backend.entity.SignStatus;
import app.signbell.backend.service.SignApiService;
import app.signbell.backend.service.SignService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sign-data")
@RequiredArgsConstructor
public class SignDataController {

    private final SignService signService;
    private final SignApiService signApiService;

    /**
     *
     * 외부 API의 수어 데이터를 프로젝트에 맞게 정제하고,
     * 특정 수어 데이터의 학습 상태를 업데이트합니다.
     *
     * ML 모델이 학습 완료 후 이 API를 호출하여 상태를 'COMPLETED'로 변경할 수 있습니다.
     *
     * @since 2025-10-16
     * @author 백승현
     */
    /**
     * 특정 수어 데이터의 학습 상태를 '완료(COMPLETED)'로 변경합니다.
     */
    @PostMapping("/{signId}/complete")
    public ResponseEntity<QuizWordUpdateResponse> markAsCompleted(@PathVariable Long signId) {
        Sign updatedSign = signService.updateLearningStatus(signId, SignStatus.COMPLETED);
        return ResponseEntity.ok(new QuizWordUpdateResponse(updatedSign));
    }

    /**
     * 특정 수어 데이터의 학습 상태를 '진행중(IN_PROGRESS)'으로 변경합니다.
     */
    @PostMapping("/{signId}/start-progress")
    public ResponseEntity<QuizWordUpdateResponse> markAsInProgress(@PathVariable Long signId) {
        Sign updatedSign = signService.updateLearningStatus(signId, SignStatus.IN_PROGRESS);
        return ResponseEntity.ok(new QuizWordUpdateResponse(updatedSign));
    }

    /**
     * 특정 수어 데이터의 학습 상태를 '미진행(PENDING)'으로 초기화합니다.
     */
    @PostMapping("/{signId}/reset")
    public ResponseEntity<QuizWordUpdateResponse> markAsPending(@PathVariable Long signId) {
        Sign updatedSign = signService.updateLearningStatus(signId, SignStatus.PENDING);
        return ResponseEntity.ok(new QuizWordUpdateResponse(updatedSign));
    }

    @GetMapping("/getApiData")
    public ResponseEntity<SignDataLoadResponseDto> getApiData() {
        long count = signApiService.fetchAllSignDataAndSave();
        return ResponseEntity.ok(new SignDataLoadResponseDto(count));
    }
}
