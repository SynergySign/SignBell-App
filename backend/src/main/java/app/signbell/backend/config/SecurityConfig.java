package app.signbell.backend.config;


import app.signbell.backend.service.CustomOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;


/**
 * Spring Security 설정 파일.
 *
 * - OAuth2 로그인 핸들러, JWT 필터 및 CORS/CSRF/세션 정책을 정의합니다.
 * - 세션을 사용하지 않는 STATELESS 방식으로 설정됩니다.
 * - 요청 권한 정책: PUBLIC_ENDPOINTS는 허용, 나머지는 인증이 필요합니다.
 * - JWT 인증 필터({@link JwtAuthenticationFilter})가 가장 먼저 동작하도록 설정합니다.
 *
 * @author 송민재
 * @since 2025-10-14
 */
@Configuration
@EnableWebSecurity  // 커스텀 시큐리티 설정파일이라는 의미
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final OAuth2FailureHandler oAuth2FailureHandler;
    private final CookieOAuth2AuthorizationRequestRepository cookieOAuth2AuthorizationRequestRepository;

    // 허용할 엔드포인트 목록을 배열로 따로 관리
    private static final String[] PUBLIC_ENDPOINTS = {
             // 프로젝트 초기 설정이므로 임시로 모든 엔드포인트 허용, 이후에 조정 필요
            "/",
            "/error",
            "/ws/**",
            "/health",
            "/api/auth/**",
            "/oauth2/**",
            "/login/oauth2/**",
            // 앞으로 추가될 퍼블릭 엔드포인트를 여기에 나열합니다.
            "/media/**",
            "/images/**",
            "/api/sign-data/**",
            "/oauth2/callback/**",
            "/api/proxy/janus/**",  // Janus WebRTC 프록시 (인증 불필요)

    };

    // [추가] application.yml에서 오리진 URL 주입
    @Value("${app.frontend-origin-url}")
    private String frontendOrigin;
    @Value("${app.backend-origin-url}")
    private String backendOrigin;

    // 시큐리티 필터체인 빈을 등록
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {

        // 커스텀 보안 설정
        http
                // 프론트엔드 개발 서버 및 지정된 오리진만 허용
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                // JWT 쿠키 기반이므로 CSRF는 사용하지 않음
                .csrf(csrf -> csrf.disable())
                // 완전한 무상태(Stateless)로 동작 (OAuth2 state는 쿠키로 관리)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // 기본 제공 로그인/기본 인증은 사용하지 않음
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                // H2 콘솔 접근을 위해 동일 출처 iframe 허용
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
                // 엔드포인트 권한 정책: 퍼블릭 → 허용, 나머지 → 인증 필요
                .authorizeHttpRequests(authz -> authz
                        // 배열에 담긴 엔드포인트에 대해 접근을 허용
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        .anyRequest().authenticated()
                )
                // OAuth2 로그인 활성화 및 사용자 정보 서비스/성공/실패 핸들러 연결
                .oauth2Login(oauth -> oauth
                        .authorizationEndpoint(authorization -> authorization
                                .authorizationRequestRepository(cookieOAuth2AuthorizationRequestRepository)
                        )
                        .redirectionEndpoint(redirection -> redirection
                                .baseUri("/api/auth/*/callback")
                        )
                        .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                        .successHandler(oAuth2SuccessHandler)
                        .failureHandler(oAuth2FailureHandler)
                )
                // 인증 실패 시 401 Unauthorized 반환 (로깅 추가)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, e) -> {
                            System.out.println("=== 401 UNAUTHORIZED ===");
                            System.out.println("Request URI: " + req.getRequestURI());
                            System.out.println("Method: " + req.getMethod());
                            System.out.println("Exception: " + (e != null ? e.getMessage() : "null"));
                            System.out.println("Cookies: " + java.util.Arrays.toString(req.getCookies()));
                            res.sendError(401);
                        })
                )
                // UsernamePasswordAuthenticationFilter 전에 JWT 필터 동작
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);


        return http.build();

    }

    /**
     * CORS 설정.
     *
     * - 개발 중에는 Vite/CRA 개발 서버를 허용합니다.
     * - 운영 배포 시, 실제 프론트엔드 도메인(예: https://app.example.com)을 추가하세요.
     * - 크리덴셜(withCredentials) 전송을 허용합니다.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // setAllowedOrigins 사용 (패턴이 아닌 정확한 오리진)
        configuration.setAllowedOrigins(Arrays.asList(
                frontendOrigin, // https://www.signbell.app
                backendOrigin   // https://api.signbell.app
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        // 중요: preflight 요청 캐싱 시간 설정
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

}