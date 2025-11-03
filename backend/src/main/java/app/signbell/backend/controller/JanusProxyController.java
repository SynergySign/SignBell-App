package app.signbell.backend.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;

/**
 * Janus WebRTC 서버 프록시 컨트롤러
 * 
 * 외부 Janus 서버(janus.jsflux.co.kr)의 CORS 문제를 해결하기 위한 프록시
 * 프론트엔드에서 직접 Janus 서버에 접근하는 대신 이 프록시를 통해 접근
 * 
 * CORS 설정은 SecurityConfig의 전역 설정을 사용합니다.
 */
@Slf4j
@RestController
@RequestMapping("/api/proxy/janus")
public class JanusProxyController {
    
    private static final String JANUS_BASE_URL = "https://janus.jsflux.co.kr/janus";
    private final RestTemplate restTemplate;
    
    public JanusProxyController() {
        this.restTemplate = new RestTemplate();
    }
    
    /**
     * Janus POST 요청 프록시
     * 
     * @param body 요청 본문
     * @param request HTTP 요청
     * @return Janus 서버 응답
     */
    @PostMapping(value = "/**", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> proxyJanusPost(
        @RequestBody(required = false) String body,
        HttpServletRequest request
    ) {
        String janusPath = extractJanusPath(request);
        String janusUrl = JANUS_BASE_URL + janusPath;
        
        log.debug("Proxying POST request to Janus: {}", janusUrl);
        
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<String> entity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(janusUrl, entity, String.class);
            
            log.debug("Janus POST response: status={}", response.getStatusCode());
            
            // Janus 서버의 CORS 헤더를 제거하고 Spring의 전역 CORS 설정만 사용
            return ResponseEntity
                .status(response.getStatusCode())
                .headers(removeCorsHeaders(response.getHeaders()))
                .body(response.getBody());
            
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            log.error("Janus proxy error: status={}, message={}", e.getStatusCode(), e.getMessage());
            return ResponseEntity
                .status(e.getStatusCode())
                .body(e.getResponseBodyAsString());
                
        } catch (Exception e) {
            log.error("Janus proxy unexpected error", e);
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("{\"error\": \"Proxy error: " + e.getMessage() + "\"}");
        }
    }
    
    /**
     * Janus GET 요청 프록시
     * 
     * @param request HTTP 요청
     * @return Janus 서버 응답
     */
    @GetMapping(value = "/**", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> proxyJanusGet(HttpServletRequest request) {
        String janusPath = extractJanusPath(request);
        String queryString = request.getQueryString();
        String janusUrl = JANUS_BASE_URL + janusPath;
        
        if (queryString != null && !queryString.isEmpty()) {
            janusUrl += "?" + queryString;
        }
        
        log.debug("Proxying GET request to Janus: {}", janusUrl);
        
        try {
            ResponseEntity<String> response = restTemplate.getForEntity(janusUrl, String.class);
            
            log.debug("Janus GET response: status={}", response.getStatusCode());
            
            // Janus 서버의 CORS 헤더를 제거하고 Spring의 전역 CORS 설정만 사용
            return ResponseEntity
                .status(response.getStatusCode())
                .headers(removeCorsHeaders(response.getHeaders()))
                .body(response.getBody());
            
        } catch (HttpClientErrorException | HttpServerErrorException e) {
            log.error("Janus proxy error: status={}, message={}", e.getStatusCode(), e.getMessage());
            return ResponseEntity
                .status(e.getStatusCode())
                .body(e.getResponseBodyAsString());
                
        } catch (Exception e) {
            log.error("Janus proxy unexpected error", e);
            return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("{\"error\": \"Proxy error: " + e.getMessage() + "\"}");
        }
    }
    

    
    /**
     * 요청 URI에서 Janus 경로 추출
     * 
     * 프론트엔드 요청: /api/proxy/janus/SESSION_ID
     * Janus 서버 경로: /janus/SESSION_ID (그대로 유지)
     * 
     * @param request HTTP 요청
     * @return Janus 경로 (/janus/... 형태)
     */
    private String extractJanusPath(HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        String proxyPrefix = "/api/proxy/janus";
        
        if (requestUri.startsWith(proxyPrefix)) {
            String path = requestUri.substring(proxyPrefix.length());
            // /janus로 시작하지 않으면 /janus를 붙임
            if (!path.startsWith("/janus")) {
                return "/janus" + path;
            }
            return path;
        }
        
        return "/janus";
    }
    
    /**
     * Janus 서버 응답에서 CORS 관련 헤더를 제거
     * Spring SecurityConfig의 전역 CORS 설정만 사용하도록 함
     * 
     * @param originalHeaders Janus 서버로부터 받은 원본 헤더
     * @return CORS 헤더가 제거된 새로운 HttpHeaders
     */
    private HttpHeaders removeCorsHeaders(HttpHeaders originalHeaders) {
        HttpHeaders cleanHeaders = new HttpHeaders();
        
        originalHeaders.forEach((key, value) -> {
            // CORS 관련 헤더는 제외
            if (!key.toLowerCase().startsWith("access-control-")) {
                cleanHeaders.addAll(key, value);
            }
        });
        
        return cleanHeaders;
    }
}
