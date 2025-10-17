package app.signbell.backend.repository.custom;

import java.util.List;

public interface SignRepositoryCustom {

    /**
     * 저장된 모든 태그의 목록을 중복 없이 조회하고 정렬합니다.
     * @return 태그 문자열 리스트
     */
    List<String> findAllTags();

}
