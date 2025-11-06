# 1. Java 17이 설치된 가벼운(slim) 공식 이미지를 기반으로 시작합니다.
FROM openjdk:17-jdk-slim

# 2. 컨테이너 내부에서 작업할 디렉토리를 /app으로 설정합니다.
WORKDIR /app

# 3. 로컬의 빌드된 .jar 파일을 컨테이너 안으로 복사합니다.
# (./build/libs/폴더의 모든 .jar 파일을 app.jar 라는 이름으로 복사)
COPY ./build/libs/*.jar app.jar

# 4. EC2 서버와 연결할 포트(8080)를 외부에 알립니다.
EXPOSE 8080

# 5. 컨테이너가 시작될 때 이 명령어를 실행하여 Spring Boot 앱을 구동합니다.
ENTRYPOINT ["java", "-jar", "app.jar"]