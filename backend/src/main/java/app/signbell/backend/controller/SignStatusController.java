// app.signbell.backend.controller 패키지에 생성
package app.signbell.backend.controller;

import app.signbell.backend.dto.request.QuizWordUpdateRequest;
import app.signbell.backend.service.SignService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/signs")
@RequiredArgsConstructor
public class SignStatusController {

    private final SignService signService;

    /**
     * 특정 수어 데이터의 학습 상태를 업데이트합니다.
     * ML 모델이 학습 완료 후 이 API를 호출하여 상태를 'COMPLETED'로 변경할 수 있습니다.
     *
     * @param signId 상태를 변경할 Sign 데이터의 ID
     * @param request 새로운 상태 정보를 담은 DTO
     * @return 성공 시 200 OK
     */
    @PatchMapping("/{signId}/status")
    public ResponseEntity<Void> updateLearningStatus(
            @PathVariable Long signId,
            @RequestBody QuizWordUpdateRequest request
    ) {
        signService.updateLearningStatus(signId, request.getNewStatus());
        return ResponseEntity.ok().build();
    }
}