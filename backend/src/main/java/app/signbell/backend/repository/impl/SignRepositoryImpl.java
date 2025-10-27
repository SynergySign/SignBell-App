package app.signbell.backend.repository.impl;

import app.signbell.backend.entity.QSign;
import app.signbell.backend.entity.Sign;
import app.signbell.backend.repository.custom.SignRepositoryCustom;
import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.core.types.dsl.NumberExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;
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
    private final QSign sign = QSign.sign; // QSign.sign으로 가정

    @Override
    public List<String> findAllTags() {
        return queryFactory
                .select(sign.categoryType).distinct() // 1. tag 컬럼을 중복 없이 선택
                .from(sign)                 // 2. Sign 테이블에서
                .orderBy(sign.categoryType.asc())    // 3. 태그를 오름차순으로 정렬
                .fetch();                   // 4. 리스트로 반환
    }

    @Override
    public Page<Sign> searchByKeyword(String keyword, Pageable pageable) {

        // 1. 정렬 우선순위 정의 (ORDER BY CASE ... )
        NumberExpression<Integer> priority = new CaseBuilder()
                .when(sign.title.eq(keyword)).then(1)         // 1순위: 완전일치
                .when(sign.title.startsWith(keyword)).then(2) // 2순위: 앞부분일치
                .when(sign.title.contains(keyword)).then(3)   // 3순위: 부분일치
                .otherwise(4);

        // 기본 정렬 (우선순위 -> 가나다순)
        OrderSpecifier<?> priorityOrder = new OrderSpecifier<>(Order.ASC, priority);
        OrderSpecifier<?> nameOrder = new OrderSpecifier<>(Order.ASC, sign.title);

        // 2. 데이터 조회 쿼리
        List<Sign> content = queryFactory
                .selectFrom(sign)
                .where(sign.title.contains(keyword)) // 기본 조건: '부분일치'
                .orderBy(priorityOrder, nameOrder)      // [핵심] 정렬 순서 적용
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        // 3. 카운트 쿼리 (페이지네이션을 위함)
        Long count = queryFactory
                .select(sign.count())
                .from(sign)
                .where(sign.title.contains(keyword))
                .fetchOne();

        return PageableExecutionUtils.getPage(content, pageable, () -> (count != null ? count : 0L));
    }
}