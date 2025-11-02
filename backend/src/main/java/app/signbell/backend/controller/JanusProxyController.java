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
 */
@Slf4j
@RestController
@RequestMapping("/api/proxy/janus")
@CrossOrigin(
    origins = {"https://www.signbell.app", "https://signbell.app"},
    allowCredentials = "true",
    methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS}
)
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
            return response;
            
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
            return response;
            
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
     * OPTIONS 요청 처리 (CORS Preflight)
     * 
     * @return 200 OK
     */
    @RequestMapping(value = "/**", method = RequestMethod.OPTIONS)
    public ResponseEntity<Void> handleOptions() {
        return ResponseEntity.ok().build();
    }
    
    /**
     * 요청 URI에서 Janus 경로 추출
     * 
     * @param request HTTP 요청
     * @return Janus 경로
     */
    private String extractJanusPath(HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        String proxyPrefix = "/api/proxy/janus";
        
        if (requestUri.startsWith(proxyPrefix)) {
            return requestUri.substring(proxyPrefix.length());
        }
        
        return "";
    }
}
