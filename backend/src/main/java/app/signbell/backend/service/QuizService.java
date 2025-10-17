package app.signbell.backend.service;

import app.signbell.backend.dto.common.ApiResponse;
import app.signbell.backend.dto.response.ChallengeAcquiredResponse;
import app.signbell.backend.dto.response.QuizQuestionResponse;
import app.signbell.backend.dto.response.QuizStartedResponse;
import app.signbell.backend.entity.GameParticipant;
import app.signbell.backend.entity.GameRoom;
import app.signbell.backend.entity.QuizWord;
import app.signbell.backend.entity.User;
import app.signbell.backend.exception.BusinessException;
import app.signbell.backend.exception.ErrorCode;
import app.signbell.backend.repository.GameParticipantRepository;
import app.signbell.backend.repository.GameRoomRepository;
import app.signbell.backend.repository.QuizWordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

/**
 * 실시간 퀴즈 게임의 핵심 로직을 담당하는 서비스 클래스입니다.
 * 게임 시작, 문제 출제, 정답 도전 처리 등 퀴즈 진행과 관련된 모든 비즈니스 로직을 포함합니다.
 *
 * @author 고동현
 * @since 2025-10-17
 */
@Service
@RequiredArgsConstructor
public class QuizService {

    private final SimpMessagingTemplate messagingTemplate;
    private final QuizWordRepository quizWordRepository;
    private final GameRoomRepository gameRoomRepository;
    private final GameParticipantRepository gameParticipantRepository;
    private final QuizStateCache quizStateCache;

    /**
     * 게임 시작 로직을 처리합니다. (수정된 버전)
     * DB에서 랜덤 문제를 조회하고, 모든 참가자에게 퀴즈 시작 메시지를 브로드캐스트합니다.
     * N+1 문제를 해결하고, 문제 번호 생성 로직을 개선했습니다.
     *
     * @param gameRoomId 게임이 시작될 방 ID
     * @param hostId 게임 시작을 요청한 사용자의 ID (방장 권한 확인용)
     */
    @Transactional(readOnly = true) // 단순 조회이므로 readOnly = true 옵션으로 성능을 최적화합니다.
    public void startGame(Long gameRoomId, Long hostId) {
        GameRoom gameRoom = gameRoomRepository.findById(gameRoomId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ROOM_NOT_FOUND));

        // TODO: 방장 권한, 최소 인원, 방 상태 등 게임 시작 조건 검증 로직을 추가해야 합니다.
        // 예: if (!gameRoom.getHost().getId().equals(hostId)) { throw new BusinessException(ErrorCode.NOT_ROOM_HOST); }

        // 1. DB에서 퀴즈 단어 8개를 랜덤으로 조회합니다. (JOIN FETCH를 사용해 N+1 문제 해결)
        List<QuizWord> randomWords = quizWordRepository.findRandomQuizWords(8);
        if (randomWords.size() < 8) {
            throw new BusinessException(ErrorCode.WORD_LIST_EMPTY);
        }

        // 2. 클라이언트에게 전송할 문제 목록(DTO)을 생성합니다. (IntStream으로 로직 개선)
        List<QuizQuestionResponse> questions = IntStream.range(0, randomWords.size())
                .mapToObj(i -> {
                    QuizWord word = randomWords.get(i);
                    return new QuizQuestionResponse(
                            i + 1,                 // 1부터 시작하는 문제 번호
                            word.getId(),          // QuizWord의 ID (QuizWordId)
                            word.getTitle()        // JOIN FETCH로 가져온 Sign의 제목
                    );
                })
                .collect(Collectors.toList());

        // 3. 최종적으로 전송할 WebSocket 응답 객체를 생성합니다.
        QuizStartedResponse responseData = new QuizStartedResponse(gameRoom.getCurrentRound(), questions);
        ApiResponse<QuizStartedResponse> apiResponse = new ApiResponse<>(true, "퀴즈가 시작되었습니다.", LocalDateTime.now(), responseData);

        // 4. 해당 게임방의 토픽을 구독하는 모든 클라이언트에게 메시지를 브로드캐스트합니다.
        String destination = "/topic/room/" + gameRoomId + "/quiz";
        messagingTemplate.convertAndSend(destination, apiResponse);
    }

    /**
     * '정답 도전' 요청을 처리합니다.
     * 선착순으로 도전 순서를 기록하고, 모든 참가자에게 도전 기회 획득 메시지를 브로드캐스트합니다.
     * @param gameRoomId     게임방 ID
     * @param userId         도전을 시도한 사용자의 ID
     * @param questionNumber 도전하는 문제의 번호
     */
    @Transactional(readOnly = true) // User, GameParticipant 조회만 하므로 readOnly=true 적용
    public void handleChallenge(Long gameRoomId, Long userId, Integer questionNumber) {
        // 1. 캐시(QuizStateCache)를 통해 이번 문제의 선착순 순서를 받아옵니다.
        int challengeOrder = quizStateCache.getAndIncrementChallengeOrder(gameRoomId, questionNumber);

        // 2. 만약 4명이 이미 도전을 완료했다면, -1이 반환되므로 아무것도 처리하지 않습니다.
        if (challengeOrder == -1) {
            // TODO: 요청한 사용자 개인에게 "이미 마감되었습니다" 라는 에러 메시지를 보내는 로직을 추가할 수 있습니다.
            return;
        }

        // 3. DB에서 도전자(Participant)의 상세 정보를 조회합니다.
        GameParticipant participant = gameParticipantRepository.findByGameRoom_IdAndParticipant_Id(gameRoomId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARTICIPANT_NOT_FOUND));

        // 4. GameParticipant 객체에서 실제 User 정보를 가져옵니다.
        User user = participant.getParticipant();

        // 5. 클라이언트에게 전송할 응답 데이터를 생성합니다.
        ChallengeAcquiredResponse responseData = new ChallengeAcquiredResponse(
                user.getId(),           // 도전자 User ID
                user.getNickname(),     // 도전자 닉네임
                questionNumber,         // 도전한 문제 번호
                challengeOrder,         // 이번 문제에서의 도전 순서 (1~4등)
                3                       // 프론트엔드에서 보여줄 준비 카운트다운 시간 (3초)
        );

        ApiResponse<ChallengeAcquiredResponse> apiResponse = new ApiResponse<>(
                true, "정답 도전 기회를 획득했습니다.", LocalDateTime.now(), responseData
        );

        // 6. 해당 게임방의 토픽을 구독하는 모든 클라이언트에게 메시지를 브로드캐스트합니다.
        messagingTemplate.convertAndSend("/topic/room/" + gameRoomId + "/quiz", apiResponse);
    }
}
