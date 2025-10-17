package app.signbell.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

/**
 * QuizStartedResponse 클래스는 퀴즈 시작 시 반환되는 응답 데이터를 담는 DTO입니다.
 *
 * 주요 필드:
 * - currentRound: 현재 진행 중인 라운드 번호
 * - questions: 퀴즈 문제 목록 (QuizQuestionResponse 객체 리스트)
 *
 * 주요 사용 사례:
 * - 퀴즈 게임 시작 응답 데이터 전달
 * - 현재 라운드 및 문제 데이터를 클라이언트로 제공
 *
 * @author 고동현
 * @since 2025-10-17
 */
@Getter
@AllArgsConstructor
public class QuizStartedResponse {
    private Integer currentRound;
    private List<QuizQuestionResponse> questions;
}