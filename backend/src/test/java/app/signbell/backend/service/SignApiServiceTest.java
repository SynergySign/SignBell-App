package app.signbell.backend.service;

import app.signbell.backend.repository.SignRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.annotation.Commit;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * SignApiService의 통합 테스트 클래스입니다.
 * @SpringBootTest 어노테이션을 사용하여 실제 애플리케이션 컨텍스트를 로드합니다.
 */
@SpringBootTest
class SignApiServiceTest {

    @Autowired
    private SignApiService signApiService;

    @Autowired
    private SignRepository signRepository;

    @Test
    @Transactional // 테스트가 끝나면 자동으로 롤백하여 DB를 원래 상태로 되돌립니다.
    @Commit // 테스트 성공 후 DB 변경사항을 실제 커밋하고 싶을 때 사용합니다. (초기 데이터 적재용)
    @DisplayName("외부 API에서 모든 수어 데이터를 가져와 DB에 저장한다")
    void fetchAllSignDataAndSaveTest() {
        // given: 테스트 실행 전 DB가 비어있는지 확인
        long initialCount = signRepository.count();
        assertThat(initialCount).isEqualTo(0);
        System.out.println("✅ 초기 데이터 개수: " + initialCount);

        // when: 서비스 메소드 실행
        signApiService.fetchAllSignDataAndSave();

        // then: 실행 후 DB에 데이터가 저장되었는지 확인
        long finalCount = signRepository.count();
        assertThat(finalCount).isGreaterThan(0L);
        System.out.println("🎉 데이터 저장 완료! 총 저장된 데이터 개수: " + finalCount);
    }
}