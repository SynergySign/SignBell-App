package app.signbell.backend.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 애플리케이션 내 전역적으로 사용되는 에러 코드를 정의한 enum 클래스입니다.
 * 각 에러 코드는 클라이언트와 서버 간의 명확한 의사소통을 위해 고유한 식별자, 메시지, HTTP 상태 코드를 포함합니다.
 *
 * 주요 에러 카테고리에는 인증/회원, 퀴즈 방, 참가자, 단어/학습, 퀴즈, AI/좌표 처리, WebRTC, 카메라/미디어, 프로필,
 * 그리고 공통 에러 등이 포함됩니다.
 *
 * 이 클래스는 에러의 종류를 명확하게 정의하고, 일관된 에러 처리 로직을 구현하는 데 도움을 줍니다.
 *
 * 에러 코드 정의는 다음 세 가지 구성 요소를 포함합니다:
 * - code: 고유한 에러 코드 문자열
 * - message: 사용자 또는 로그를 위한 에러 메시지
 * - status: HTTP 상태 코드를 나타내는 숫자
 *
 * @author 강관주
 * @since 2025-10-10
 */
@Getter
@AllArgsConstructor
public enum ErrorCode {

    // ============================================
    // 인증/회원 관련 에러 (AUTH)
    // ============================================
    UNAUTHORIZED("UNAUTHORIZED", "인증되지 않은 사용자입니다.", 401),
    INVALID_TOKEN("INVALID_TOKEN", "유효하지 않은 토큰입니다.", 401),
    EXPIRED_TOKEN("EXPIRED_TOKEN", "만료된 토큰입니다.", 401),
    REFRESH_TOKEN_NOT_FOUND("REFRESH_TOKEN_NOT_FOUND", "리프레시 토큰을 찾을 수 없습니다.", 401),
    INVALID_REFRESH_TOKEN("INVALID_REFRESH_TOKEN", "유효하지 않은 리프레시 토큰입니다.", 401),
    USER_NOT_FOUND("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.", 404),
    KAKAO_LOGIN_FAILED("KAKAO_LOGIN_FAILED", "카카오 로그인에 실패했습니다.", 500),
    TERMS_NOT_AGREED("TERMS_NOT_AGREED", "약관 동의가 필요합니다.", 403),
    ALREADY_REGISTERED_USER("ALREADY_REGISTERED_USER", "이미 가입된 사용자입니다.", 409),

    // ============================================
    // 퀴즈 방 관련 에러 (ROOM)
    // ============================================
    ROOM_NOT_FOUND("ROOM_NOT_FOUND", "퀴즈 방을 찾을 수 없습니다.", 404),
    ROOM_FULL("ROOM_FULL", "방 인원이 가득 찼습니다.", 400),
    ROOM_ALREADY_STARTED("ROOM_ALREADY_STARTED", "이미 시작된 방입니다.", 400),
    ROOM_MIN_PARTICIPANTS_NOT_MET("ROOM_MIN_PARTICIPANTS_NOT_MET", "퀴즈 시작을 위한 최소 인원이 부족합니다.", 400),
    ROOM_MAX_PARTICIPANTS_EXCEEDED("ROOM_MAX_PARTICIPANTS_EXCEEDED", "최대 인원을 초과했습니다.", 400),
    INVALID_ROOM_STATUS("INVALID_ROOM_STATUS", "유효하지 않은 방 상태입니다.", 400),
    ROOM_ALREADY_FINISHED("ROOM_ALREADY_FINISHED", "이미 종료된 방입니다.", 400),

    // ============================================
    // 참가자 관련 에러 (PARTICIPANT)
    // ============================================
    PARTICIPANT_NOT_FOUND("PARTICIPANT_NOT_FOUND", "참가자를 찾을 수 없습니다.", 404),
    PARTICIPANT_ALREADY_IN_ROOM("PARTICIPANT_ALREADY_IN_ROOM", "이미 방에 참여 중입니다.", 409),
    NOT_ROOM_HOST("NOT_ROOM_HOST", "방장 권한이 없습니다.", 403),
    CAMERA_PERMISSION_REQUIRED("CAMERA_PERMISSION_REQUIRED", "카메라 권한이 필요합니다.", 403),
    PARTICIPANT_NOT_IN_ROOM("PARTICIPANT_NOT_IN_ROOM", "방에 참여하지 않은 사용자입니다.", 400),
    PARTICIPANT_NOT_READY("PARTICIPANT_NOT_READY", "참가자가 준비되지 않았습니다.", 400),
    NOT_ALLOWED_READY_FOR_HOST("NOT_ALLOWED_READY_FOR_HOST", "방장은 준비 상태를 변경할 수 없습니다.", 403),

    // ============================================
    // 단어/학습 관련 에러 (WORD)
    // ============================================
    WORD_NOT_FOUND("WORD_NOT_FOUND", "단어를 찾을 수 없습니다.", 404),
    WORD_LIST_EMPTY("WORD_LIST_EMPTY", "학습 가능한 단어가 없습니다.", 404),
    VIDEO_NOT_FOUND("VIDEO_NOT_FOUND", "영상을 찾을 수 없습니다.", 404),
    INVALID_WORD_ID("INVALID_WORD_ID", "유효하지 않은 단어 ID입니다.", 400),
    INVALID_SIGN_STATUS("INVALID_SIGN_STATUS", "유효하지 않은 단어 상태입니다.", 400),

    // ============================================
    // 퀴즈 관련 에러 (QUIZ)
    // ============================================
    QUIZ_NOT_FOUND("QUIZ_NOT_FOUND", "퀴즈를 찾을 수 없습니다.", 404),
    GAME_NOT_IN_PROGRESS("GAME_NOT_IN_PROGRESS", "게임이 진행 중이 아닙니다.", 400),
    GAME_STILL_IN_PROGRESS("GAME_STILL_IN_PROGRESS", "게임이 아직 진행 중입니다.", 400),
    INVALID_QUESTION_NUMBER("INVALID_QUESTION_NUMBER", "유효하지 않은 문제 번호입니다.", 400),

    // ============================================
    // AI/좌표 처리 관련 에러 (AI)
    // ============================================
    COORDINATE_EXTRACTION_FAILED("COORDINATE_EXTRACTION_FAILED", "좌표 추출에 실패했습니다.", 500),
    AI_MODEL_ERROR("AI_MODEL_ERROR", "AI 모델 처리 중 오류가 발생했습니다.", 500),
    SIMILARITY_CHECK_FAILED("SIMILARITY_CHECK_FAILED", "유사도 검사에 실패했습니다.", 500),
    INVALID_COORDINATE_DATA("INVALID_COORDINATE_DATA", "유효하지 않은 좌표 데이터입니다.", 400),
    AI_MODEL_TIMEOUT("AI_MODEL_TIMEOUT", "AI 모델 응답 시간이 초과되었습니다.", 504),
    LEARNING_DATA_SAVE_FAILED("LEARNING_DATA_SAVE_FAILED", "학습 데이터 저장에 실패했습니다.", 500),

    // ============================================
    // WebRTC 관련 에러 (WEBRTC)
    // ============================================
    WEBRTC_CONNECTION_FAILED("WEBRTC_CONNECTION_FAILED", "WebRTC 연결에 실패했습니다.", 500),
    SIGNALING_ERROR("SIGNALING_ERROR", "시그널링 오류가 발생했습니다.", 500),
    PEER_CONNECTION_ERROR("PEER_CONNECTION_ERROR", "피어 연결 오류가 발생했습니다.", 500),
    MEDIA_STREAM_ERROR("MEDIA_STREAM_ERROR", "미디어 스트림 오류가 발생했습니다.", 500),
    NETWORK_DISCONNECTED("NETWORK_DISCONNECTED", "네트워크 연결이 끊어졌습니다.", 500),

    // ============================================
    // 카메라/미디어 관련 에러 (MEDIA)
    // ============================================
    CAMERA_NOT_AVAILABLE("CAMERA_NOT_AVAILABLE", "카메라를 사용할 수 없습니다.", 400),
    CAMERA_PERMISSION_DENIED("CAMERA_PERMISSION_DENIED", "카메라 권한이 거부되었습니다.", 403),
    WEBCAM_ACCESS_FAILED("WEBCAM_ACCESS_FAILED", "웹캠 접근에 실패했습니다.", 500),
    INVALID_VIDEO_FORMAT("INVALID_VIDEO_FORMAT", "유효하지 않은 비디오 형식입니다.", 400),
    VIDEO_PROCESSING_ERROR("VIDEO_PROCESSING_ERROR", "비디오 처리 중 오류가 발생했습니다.", 500),

    // ============================================
    // 프로필 관련 에러 (PROFILE)
    // ============================================
    PROFILE_NOT_FOUND("PROFILE_NOT_FOUND", "프로필을 찾을 수 없습니다.", 404),
    INVALID_NICKNAME("INVALID_NICKNAME", "유효하지 않은 닉네임입니다.", 400),
    NICKNAME_ALREADY_EXISTS("NICKNAME_ALREADY_EXISTS", "이미 사용 중인 닉네임입니다.", 409),
    PROFILE_IMAGE_UPLOAD_FAILED("PROFILE_IMAGE_UPLOAD_FAILED", "프로필 이미지 업로드에 실패했습니다.", 500),
    INVALID_IMAGE_FORMAT("INVALID_IMAGE_FORMAT", "유효하지 않은 이미지 형식입니다.", 400),

    // ============================================
    // 공통 에러 (COMMON)
    // ============================================
    INTERNAL_SERVER_ERROR("INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다.", 500),
    INVALID_INPUT("INVALID_INPUT", "유효하지 않은 입력값입니다.", 400),
    RESOURCE_NOT_FOUND("RESOURCE_NOT_FOUND", "요청한 리소스를 찾을 수 없습니다.", 404),
    METHOD_NOT_ALLOWED("METHOD_NOT_ALLOWED", "허용되지 않은 메소드입니다.", 405),
    BAD_REQUEST("BAD_REQUEST", "잘못된 요청입니다.", 400),
    FORBIDDEN("FORBIDDEN", "접근 권한이 없습니다.", 403),
    SERVICE_UNAVAILABLE("SERVICE_UNAVAILABLE", "서비스를 사용할 수 없습니다.", 503),
    DATABASE_ERROR("DATABASE_ERROR", "데이터베이스 오류가 발생했습니다.", 500),

    // ============================================
    // 비즈니스 에러 (BUSINESS)
    // ============================================
    BUSINESS_ERROR("BUSINESS_ERROR", "비즈니스 로직 오류가 발생했습니다.", 400),
    VALIDATION_ERROR("VALIDATION_ERROR", "유효성 검사에 실패했습니다.", 400),
    DUPLICATE_RESOURCE("DUPLICATE_RESOURCE", "이미 존재하는 리소스입니다.", 409);


    private final String code;
    private final String message;
    private final int status;

}
