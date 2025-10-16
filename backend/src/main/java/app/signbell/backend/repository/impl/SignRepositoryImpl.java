package app.signbell.backend.repository.impl;

import app.signbell.backend.repository.custom.SignRepositoryCustom;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;

// QSign 클래스를 static import 합니다.
import static app.signbell.backend.entity.QSign.sign;
/**
 * SignRepositoryCustom의 구현체입니다. QueryDSL 쿼리를 작성합니다.
 */
@Repository
@RequiredArgsConstructor
public class SignRepositoryImpl implements SignRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public List<String> findAllTags() {
        return queryFactory
                .select(sign.categoryType).distinct() // 1. tag 컬럼을 중복 없이 선택
                .from(sign)                 // 2. Sign 테이블에서
                .orderBy(sign.categoryType.asc())    // 3. 태그를 오름차순으로 정렬
                .fetch();                   // 4. 리스트로 반환
    }
}