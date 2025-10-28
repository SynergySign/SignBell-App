# SignBell-App

SignBell 프로젝트의 백엔드와 프론트엔드를 포함한 모노레포입니다.

## 작성자

- [고동현](https://github.com/rhehdgus8831)

## 대상 독자

- 개발 환경을 설정하고 로컬에서 프로젝트를 실행하려는 개발자
- 프로젝트에 새로 합류한 팀원
- 프로젝트 구조와 설정을 빠르게 파악하고자 하는 기여자

## 레포지토리 구조

```
SignBell-App/
├── backend/     # Spring Boot 기반 백엔드 API 서버
└── frontend/    # React (Vite) 기반 프론트엔드 애플리케이션
```

## 사전 준비 사항

### 공통
- Git

### 백엔드
- JDK 17 이상
- MariaDB (또는 MySQL)

### 프론트엔드
- Node.js 18 이상
- npm

## 빠른 시작

### 1. 저장소 클론

```bash
git clone https://github.com/SynergySign/SignBell-App.git
cd SignBell-App
```

### 2. 백엔드 설정 및 실행

```bash
cd backend

# 데이터베이스 생성 (MariaDB/MySQL)
# CREATE DATABASE signbell DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci;

# 환경 변수 설정 (이미 .env 파일이 있다면 생략)
# cp env.example .env
# .env 파일을 열어 DB 정보, JWT_SECRET, KAKAO_CLIENT_ID 등을 수정하세요

# SSL 인증서 생성 (최초 1회)
# 문제 해결 섹션의 "SSL 인증서 생성" 참고

# 서버 실행 (Windows)
gradlew.bat bootRun

# 서버 실행 (Mac/Linux)
./gradlew bootRun
```

백엔드 서버는 `https://localhost:8443`에서 실행됩니다.

### 3. 프론트엔드 설정 및 실행

새 터미널을 열고:

```bash
cd frontend

# 환경 변수 설정 (이미 .env 파일이 있다면 생략)
# cp env.example .env

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

프론트엔드는 `https://localhost:5173`에서 실행됩니다.
(SSL 인증서: vite-plugin-mkcert가 자동 생성)

## 환경 변수 설정

### 백엔드 (.env)

`backend/.env` 파일의 주요 설정 항목:

```env
# 서버 포트 (HTTPS)
SERVER_PORT=8443

# 데이터베이스 (로컬 개발 환경)
# application-dev.yml에 기본값이 설정되어 있음
# DB_URL=jdbc:mariadb://localhost:3306/signbell
# DB_USERNAME=root
# DB_PASSWORD=mariadb

# JWT (32자 이상의 강력한 비밀키 사용)
JWT_SECRET=kq2B8xv4zJ9L1t6Q3w8Y2u5R7o0M3n6B9c2E5h8J1k4=
JWT_ACCESS_TOKEN_EXPIRATION=900000
JWT_REFRESH_TOKEN_EXPIRATION=604800000

# 쿠키 설정
COOKIE_ACCESS_TOKEN_MAX_AGE=900
COOKIE_REFRESH_TOKEN_MAX_AGE=604800
COOKIE_DOMAIN=

# OAuth2 (카카오 개발자센터에서 발급)
KAKAO_CLIENT_ID=your_kakao_client_id
KAKAO_CLIENT_SECRET=your_kakao_client_secret
KAKAO_PROD_REDIRECT_URI=your_kakao_redirect_uri_here

# OAuth2 로그인 후 프론트엔드 리다이렉트 URL
APP_OAUTH2_SUCCESS_REDIRECT_URL=https://localhost:5173/terms
APP_OAUTH2_FAILURE_REDIRECT_URL=https://localhost:5173?from=oauth2

# 국어원 API (선택사항)
API_SERVICE_KEY=your_api_service_key
API_REQUEST_URL=https://api.kcisa.kr/openapi/service/rest/meta13/getCTE01701
```

### 프론트엔드 (.env)

`frontend/.env` 파일의 주요 설정 항목:

```env
# API 설정 (백엔드 직접 연결)
VITE_API_URL=https://localhost:8443

# 개발 환경 설정
VITE_APP_ENV=development
VITE_APP_DEBUG=true

# WebSocket 설정 (HTTPS 환경이므로 wss 사용)
VITE_WS_URL=wss://localhost:8443/ws

# FastAPI WebSocket (선택사항)
VITE_FASTAPI_URL=wss://localhost:8000/ws

# Janus WebRTC Gateway
VITE_JANUS_SERVER=https://janus.jsflux.co.kr/janus
```

## 문제 해결

### 포트 충돌 (Port already in use)

8443 또는 5173 포트가 이미 사용 중인 경우:
- 해당 프로세스를 종료하거나
- `backend/src/main/resources/application-dev.yml`과 `frontend/vite.config.js`에서 포트를 변경하세요

### npm install 오류

node_modules 폴더와 package-lock.json 파일을 삭제한 후 재설치하세요.

### SSL 인증서 생성 (Windows 환경)

백엔드 실행 시 `keystore.p12` 파일을 찾을 수 없다는 오류가 발생하면 다음 단계를 따라주세요.

#### 1단계: 필수 도구 설치

PowerShell을 관리자 권한으로 실행:

```powershell
# Chocolatey 설치
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# mkcert 설치
choco install mkcert
```

#### 2단계: 로컬 인증서 생성

```powershell
# mkcert 로컬 인증 기관(CA) 설치
mkcert -install

# 인증서 저장 디렉토리 생성
mkdir C:/certs

# localhost용 PEM 인증서 생성
mkcert -cert-file C:/certs/localhost+1.pem -key-file C:/certs/localhost+1-key.pem localhost 127.0.0.1 ::1
```

#### 3단계: PKCS12 Keystore로 변환

Git에 포함된 OpenSSL을 사용하여 PEM 파일을 PKCS12 형식으로 변환:

```powershell
# backend 디렉토리에서 실행
cd backend

# OpenSSL로 PKCS12 변환 (비밀번호: signbell1234)
& "C:\Program Files\Git\usr\bin\openssl.exe" pkcs12 -export `
  -out keystore.p12 `
  -inkey C:/certs/localhost+1-key.pem `
  -in C:/certs/localhost+1.pem `
  -name signbell-alias `
  -passout pass:signbell1234

# keystore 파일을 리소스 폴더로 이동
copy keystore.p12 .\src\main\resources\
```

#### 인증서 정보
- 별칭(alias): `signbell-alias`
- 비밀번호(password): `signbell1234`
- 위치: `backend/src/main/resources/keystore.p12`

#### Mac/Linux 환경

```bash
# mkcert 설치 (Homebrew)
brew install mkcert

# 로컬 CA 설치
mkcert -install

# 인증서 생성
mkdir -p ~/certs
mkcert -cert-file ~/certs/localhost+1.pem -key-file ~/certs/localhost+1-key.pem localhost 127.0.0.1 ::1

# PKCS12 변환
cd backend
openssl pkcs12 -export \
  -out keystore.p12 \
  -inkey ~/certs/localhost+1-key.pem \
  -in ~/certs/localhost+1.pem \
  -name signbell-alias \
  -passout pass:signbell1234

# keystore 파일 이동
cp keystore.p12 src/main/resources/
```

### CORS 또는 401 오류

1. 백엔드 서버가 먼저 실행되었는지 확인
2. 브라우저에서 `https://localhost:8443`과 `https://localhost:5173`에 각각 접속하여 SSL 인증서 신뢰 처리
3. 쿠키 설정 확인: `application-dev.yml`의 `cookie.domain`이 `localhost`로 설정되어 있는지 확인

### 웹캠 접근 불가

브라우저에서 `https://localhost:5173`의 카메라 접근 권한을 허용했는지 확인하세요.

## 프로젝트 구조

### 백엔드

```
backend/src/main/java/app/signbell/backend/
├── config/          # Security, WebSocket, JWT/OAuth 설정
├── controller/      # API 엔드포인트
│   ├── gameRoom/    # 퀴즈 방 관리
│   ├── myPage/      # 마이페이지
│   ├── signEdu/     # 수어 학습
│   └── user/        # 인증 및 사용자 관리
├── dto/             # 데이터 전송 객체
├── entity/          # JPA 엔티티
├── exception/       # 예외 처리
├── repository/      # 데이터 접근 계층
├── service/         # 비즈니스 로직
└── util/            # 유틸리티
```

### 프론트엔드

```
frontend/src/
├── components/      # 재사용 가능한 UI 컴포넌트
│   ├── auth/        # 로그인
│   ├── main/        # 메인 페이지
│   ├── quiz/        # 퀴즈 게임
│   ├── study/       # 개인 학습
│   └── mypage/      # 마이페이지
├── hooks/           # 커스텀 훅
├── pages/           # 페이지 컴포넌트
├── services/        # API 및 WebSocket 통신
├── store/           # Zustand 상태 관리
├── contexts/        # React Context (WebRTC)
└── routes/          # 라우팅 설정
```

## 기여하기

1. 저장소를 Fork합니다
2. 기능 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경 사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다