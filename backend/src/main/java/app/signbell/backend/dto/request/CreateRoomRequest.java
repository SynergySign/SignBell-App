package app.signbell.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 방 생성을 요청하는 정보를 담는 클래스.
 *
 * 해당 클래스는 방 제목을 포함한 방 생성 요청 데이터를 정의합니다.
 * 유효성 검사를 통해 방 제목이 공백이 아니고, 최소 1자에서 최대 50자 이내로
 * 작성되었는지 확인합니다.
 *
 * @author 강관주
 * @since 2025-10-13
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class CreateRoomRequest {

    @NotBlank(message = "방 제목은 필수입니다.")
    @Size(min = 1, max = 50, message = "방 제목은 1~50자여야 합니다.")
    private String gameTitle;
}
