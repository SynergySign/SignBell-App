package app.signbell.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 외부 수어 데이터 API의 JSON 응답을 매핑하기 위한 DTO 클래스입니다.
 * 중첩된 JSON 구조를 표현하기 위해 여러 static inner class로 구성됩니다.
 *
 * @author 백승현
 * @since 2025-10-16
 */
@Getter
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true) // JSON에 있는데 클래스에 없는 필드는 무시
public class SignApiResponse {
    private Response response;

    @JsonCreator
    public SignApiResponse(@JsonProperty("response") Response response) {
        this.response = response;
    }

    @Getter
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Response {
        private ResponseHeader header;
        private ResponseBody body;

        @JsonCreator
        public Response(
                @JsonProperty("header") ResponseHeader header,
                @JsonProperty("body") ResponseBody body) {
            this.header = header;
            this.body = body;
        }

        @Getter
        @NoArgsConstructor
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class ResponseHeader {
            private String resultCode;
            private String resultMsg;

            @JsonCreator
            public ResponseHeader(
                    @JsonProperty("resultCode") String resultCode,
                    @JsonProperty("resultMsg") String resultMsg) {
                this.resultCode = resultCode;
                this.resultMsg = resultMsg;
            }
        }

        @Getter
        @NoArgsConstructor
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class ResponseBody {
            private Items items;
            private String numOfRows;
            private String pageNo;
            private String totalCount;

            @JsonCreator
            public ResponseBody(
                    @JsonProperty("items") Items items,
                    @JsonProperty("numOfRows") String numOfRows,
                    @JsonProperty("pageNo") String pageNo,
                    @JsonProperty("totalCount") String totalCount) {
                this.items = items;
                this.numOfRows = numOfRows;
                this.pageNo = pageNo;
                this.totalCount = totalCount;
            }

            @Getter
            @NoArgsConstructor
            @JsonIgnoreProperties(ignoreUnknown = true)
            public static class Items {
                private List<Item> item;

                @JsonCreator
                public Items(@JsonProperty("item") List<Item> item) {
                    this.item = item;
                }

                @Getter
                @NoArgsConstructor
                @JsonIgnoreProperties(ignoreUnknown = true)
                public static class Item {
                    private String title;
                    private String url;
                    private String signDescription; // << ✨ 추가된 필드
                    private String categoryType;

                    @JsonCreator
                    public Item(
                            @JsonProperty("title") String title,
                            @JsonProperty("url") String url,
                            @JsonProperty("signDescription") String signDescription, // << ✨ 추가
                            @JsonProperty("categoryType") String categoryType) {
                        this.title = title;
                        this.url = url;
                        this.signDescription = signDescription; // << ✨ 추가
                        this.categoryType = categoryType;
                    }
                }
            }
        }
    }
}
