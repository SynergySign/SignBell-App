package app.signbell.backend.config;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * QuerydslConfig 클래스는 Querydsl을 사용하기 위한 설정을 정의하는 구성 클래스입니다.
 *
 * 주요 기능:
 * - JPAQueryFactory를 Bean으로 등록하여 애플리케이션 내에서 Querydsl을 간편하게 사용할 수 있도록 합니다.
 *
 * 구성 요소:
 * - EntityManager를 사용하여 JPAQueryFactory를 초기화하며, 이를 통해 데이터베이스에 대한 Querydsl 쿼리를 수행할 수 있습니다.
 *
 * @author 강관주
 * @since 2025-10-10
 */
@Configuration
public class QuerydslConfig {

    @PersistenceContext
    private EntityManager entityManager;

    @Bean
    JPAQueryFactory jpaQueryFactory() {
        return new JPAQueryFactory(entityManager);
    }
}
