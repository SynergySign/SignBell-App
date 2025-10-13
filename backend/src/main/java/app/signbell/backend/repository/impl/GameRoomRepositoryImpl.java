package app.signbell.backend.repository.impl;

import app.signbell.backend.entity.GameRoom;
import app.signbell.backend.entity.GameRoomStatus;
import app.signbell.backend.repository.custom.GameRoomRepositoryCustom;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.stereotype.Repository;

import java.util.List;

import static app.signbell.backend.entity.QGameRoom.gameRoom;

/**
 * GameRoomRepositoryImpl 클래스는 GameRoomRepositoryCustom 인터페이스를 구현하여
 * 사용자 정의 쿼리 메서드를 제공합니다. Spring Data JPA의 QueryDSL을 사용하여
 * 복잡한 쿼리 로직을 처리합니다.
 *
 * @author 강관주
 * @since 2025-10-13
 */
@Repository
@Slf4j
@RequiredArgsConstructor
public class GameRoomRepositoryImpl implements GameRoomRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    /**
     * WAITING 상태의 게임방 목록을 무한 스크롤 방식으로 조회합니다.
     * 조회 결과는 요청된 페이징 정보에 따라 정렬 및 개수 제한이 적용됩니다.
     *
     * @param pageable 페이징 정보를 포함하는 객체
     *                 (요청 페이지 번호, 페이지 크기 등)
     * @return 무한 스크롤 방식으로 분할된 게임방 목록을 반환하는 Slice 객체
     *         (다음 페이지 존재 여부 포함)
     */
    @Override
    public Slice<GameRoom> findWaitingRooms(Pageable pageable) {
        /*
            무한 스크롤 구현 로직:
            1. 요청한 size보다 1개 더 조회 (size + 1)
            2. 실제로 size + 1개가 조회되면 hasNext = true
            3. 마지막 추가 데이터는 제거하고 size개만 반환

            예시: size = 20
            - 21개 조회 시도
            - 21개 조회됨 → hasNext = true, 20개만 반환
            - 15개 조회됨 → hasNext = false, 15개 반환
         */

        // WAITING 상태의 방 목록 조회 (생성일 최신순)
        List<GameRoom> roomList = queryFactory
                .selectFrom(gameRoom)
                .leftJoin(gameRoom.host).fetchJoin() // N+1 방지
                .where(gameRoom.status.eq(GameRoomStatus.WAITING))
                .orderBy(gameRoom.createdAt.desc())
                .offset(pageable.getOffset())           // 건너뛸 개수
                .limit(pageable.getPageSize() + 1)      // 조회할 개수 + 1
                .fetch();

        // 다음 페이지 존재 여부 확인
        boolean hasNext = false;
        if (roomList.size() > pageable.getPageSize()) {
            hasNext = true;
            // 추가로 조회한 마지막 데이터 제거
            roomList.remove(roomList.size() - 1);
        }

        log.debug("방 목록 조회 완료. 조회된 방 개수: {}, hasNext: {}", roomList.size(), hasNext);

        return new SliceImpl<>(roomList, pageable, hasNext);
    }
}
