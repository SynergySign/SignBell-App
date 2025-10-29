# backend/Dockerfile
# Alpine 대신 일반 이미지 사용 (멀티 플랫폼 지원)
FROM eclipse-temurin:17-jre

WORKDIR /app

# Gradle 빌드 결과물 복사 (Jenkins에서 빌드 완료 후)
COPY build/libs/*.jar app.jar

# 환경 변수 설정 (선택 사항, K8s에서 주입 가능)
ENV SPRING_PROFILES_ACTIVE=prod

EXPOSE 9090

ENTRYPOINT ["java", "-jar", "app.jar"]