package app.signbell.backend.repository;

import app.signbell.backend.entity.SignApi;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SignApiRepository extends JpaRepository<SignApi, Long> {
}