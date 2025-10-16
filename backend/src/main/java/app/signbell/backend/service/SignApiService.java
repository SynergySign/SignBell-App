package app.signbell.backend.service;

import app.signbell.backend.dto.response.SignApiResponse;
import app.signbell.backend.entity.Sign;
import app.signbell.backend.entity.SignApi;
import app.signbell.backend.repository.SignApiRepository;
import app.signbell.backend.repository.SignRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

/**
 * 외부 수어 API와 통신하여 데이터를 가져와 데이터베이스에 저장하는 서비스입니다.
 *
 * 최초 수어DB 구축 시에만 실행되며, 이후에는 API 호출 없이 이 로직으로 생성된 Sign 테이블의 데이터를 사용합니다.
 *
 * 작업 흐름은 다음과 같습니다:
 * 1. API에서 데이터를 페이징 처리하여 모두 가져옵니다.
 * 2. 가져온 원본 데이터를 'sign_api' 임시 테이블에 저장합니다.
 * 3. 'sign_api' 테이블의 데이터를 가공하여 'sign' 서비스 테이블에 저장합니다.
 *
 * @author 백승현
 * @since 2025-10-16
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SignApiService {

    private final SignRepository signRepository;
    private final SignApiRepository signApiRepository; // SignApi 리포지토리 주입
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${api.serviceKey}")
    private String apiServiceKey;

    @Value("${api.requestUrl}")
    private String apiRequestUrl;

    @Transactional
    public void fetchAllSignDataAndSave() {
        // ======================================================================
        // 1단계: API 데이터를 가져와 'sign_api' 임시 테이블에 원본 저장
        // ======================================================================
        if (signApiRepository.count() == 0) {
            log.info("🚀 [1/2] API 원본 데이터 저장을 시작합니다.");
            int pageNo = 1;
            int numOfRows = 500;
            boolean hasMoreData = true;

            while (hasMoreData) {
                String url = String.format("%s?serviceKey=%s&pageNo=%d&numOfRows=%d",
                        apiRequestUrl, apiServiceKey, pageNo, numOfRows);
                try {
                    log.info("📡 API 호출 중... (페이지: {})", pageNo);
                    ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
                    SignApiResponse apiResponse = objectMapper.readValue(response.getBody(), SignApiResponse.class);

                    List<SignApiResponse.Response.ResponseBody.Items.Item> items = apiResponse.getResponse().getBody().getItems().getItem();
                    if (items == null || items.isEmpty()) {
                        hasMoreData = false;
                        continue;
                    }

                    List<SignApi> rawDataToSave = new ArrayList<>();
                    for (var item : items) {
                        SignApi rawData = SignApi.builder()
                                .title(item.getTitle())
                                .url(item.getUrl())
                                .signDescription(item.getSignDescription())
                                .categoryType(item.getCategoryType())
                                .build();
                        rawDataToSave.add(rawData);
                    }
                    signApiRepository.saveAll(rawDataToSave);
                    log.info("📄 [1/2] 페이지 {}의 원본 데이터 {}개를 'sign_api' 테이블에 저장했습니다.", pageNo, rawDataToSave.size());

                    if (items.size() < numOfRows) hasMoreData = false;
                    else pageNo++;
                    Thread.sleep(500);

                } catch (Exception e) {
                    log.error("❗️ [1/2] API 호출 또는 원본 데이터 저장 중 오류 발생 (페이지: {})", pageNo, e);
                    break; // 오류 발생 시 중단
                }
            }
            log.info("🎉 [1/2] API 원본 데이터 저장을 완료했습니다.");
        } else {
            log.info("✅ [1/2] 'sign_api' 테이블에 이미 데이터가 존재하여 API 호출을 건너뜁니다.");
        }

        // ======================================================================
        // 2단계: 'sign_api' 테이블 데이터를 'sign' 서비스 테이블로 가공 및 이전
        // ======================================================================
        if (signRepository.count() == 0) {
            log.info("🚀 [2/2] 'sign_api' -> 'sign' 테이블로 데이터 이전을 시작합니다.");
            List<SignApi> allRawData = signApiRepository.findAll();
            List<Sign> signsToSave = new ArrayList<>();

            for (SignApi rawData : allRawData) {
                String fullTitle = rawData.getTitle().trim();
                if (!fullTitle.isEmpty()) {
                    Sign sign = Sign.builder()
                            .title(fullTitle)
                            .url(rawData.getUrl())
                            .signDescription(rawData.getSignDescription())
                            .categoryType(rawData.getCategoryType() != null ? rawData.getCategoryType() : "기타")
                            .build();
                    signsToSave.add(sign);
                }
            }

            signRepository.saveAll(signsToSave);
            log.info("🎉 [2/2] 'sign' 테이블로 데이터 {}개 이전을 완료했습니다.", signsToSave.size());
        } else {
            log.info("✅ [2/2] 'sign' 테이블에 이미 데이터가 존재하여 이전을 건너뜁니다.");
        }
    }
}