package app.signbell.backend.config;

import com.p6spy.engine.logging.Category;
import com.p6spy.engine.spy.P6SpyOptions;
import com.p6spy.engine.spy.appender.MessageFormattingStrategy;
import jakarta.annotation.PostConstruct;
import org.hibernate.engine.jdbc.internal.FormatStyle;
import org.springframework.context.annotation.Configuration;

/**
 * P6SpyConfig 클래스는 P6Spy의 SQL 로깅 포맷을 커스터마이징하기 위해 설정하는 구성 클래스입니다.
 * 이 클래스는 Spring의 Configuration으로 등록되며, P6Spy의 MessageFormattingStrategy를 구현하여
 * SQL 로그 메시지의 포맷을 정의합니다.
 *
 * 주요 기능:
 * - P6Spy의 로그 메시지 형식을 설정합니다.
 * - 실행된 SQL과 관련된 세부 정보를 재포맷하여 좀 더 읽기 쉽도록 제공합니다.
 *
 * @author 강관주
 * @since 2025-10-10
 */
@Configuration
public class P6SpyConfig implements MessageFormattingStrategy {

    @PostConstruct
    public void setLogMessageFormat() {
        P6SpyOptions.getActiveInstance().setLogMessageFormat(this.getClass().getName());
    }

    @Override
    public String formatMessage(int connectionId, String now, long elapsed, String category, String prepared, String sql, String url) {
        sql = formatSql(category, sql);
        return String.format("[%s] | %d ms | %s", category, elapsed, sql);
    }

    private String formatSql(String category, String sql) {
        if (sql == null || sql.trim().isEmpty()) return sql;

        // Only format Statement, BatchedStatement category
        if (Category.STATEMENT.getName().equals(category) || Category.BATCH.getName().equals(category)) {
            String trimmedSQL = sql.trim().toLowerCase();
            if (trimmedSQL.startsWith("create") || trimmedSQL.startsWith("alter") || trimmedSQL.startsWith("comment")) {
                sql = FormatStyle.DDL.getFormatter().format(sql);
            } else {
                sql = FormatStyle.BASIC.getFormatter().format(sql);
            }
            return sql;
        }
        return sql;
    }
}

