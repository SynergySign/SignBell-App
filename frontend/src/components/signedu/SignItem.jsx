// src/components/SignItem.jsx
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 단일 수어 단어 아이템을 렌더링합니다.
 * @param {object} sign - SignSimpleResponseDto 객체
 */
const SignItem = ({ sign }) => {
    // DTO 필드명에 맞게 signId와 wordName을 사용합니다.
    const { signId, wordName } = sign;

    return (
        <Link
            key={signId}
            to={`/personal-study/${signId}`} // 라우터 경로에 맞게 단어 상세 페이지로 이동
            className="block bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1"
        >
            {/* 요구사항 1: 단어 제목만 렌더링 */}
            <h3 className="text-xl font-semibold text-center mb-1 text-gray-800 truncate">{wordName}</h3>
        </Link>
    );
};

export default SignItem;
