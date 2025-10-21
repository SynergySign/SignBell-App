// src/pages/SignEduPage.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
// 단일 단어 아이템을 렌더링하는 컴포넌트 임포트
import SignItem from '../../components/signedu/SignItem';

// --- 환경 변수 사용 ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
// --------------------

// 단어 목록 컴포넌트 (SignWordList): 카테고리 선택 후 해당 단어들을 조회하고 SignItem으로 렌더링
const SignWordList = ({ selectedCategory }) => {
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 카테고리별 단어 목록 조회
    useEffect(() => {
        if (!selectedCategory) return;

        setLoading(true);
        // GET /api/sign-edu?category=카테고리명&size=20
        axios.get(`${API_BASE_URL}/api/sign-edu?category=${selectedCategory}&size=20`)
            .then(response => {
                // 가정: Spring 응답은 { content: [...], ... } Page 객체 형태
                setWords(response.data.content || response.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(`단어 목록 API 호출 실패 (${selectedCategory}):`, err);
                setError(`'${selectedCategory}' 단어 목록을 불러오는 데 실패했습니다. 서버 연결 확인 필요.`);
                setLoading(false);
                setWords([]);
            });
    }, [selectedCategory]);

    if (loading) return <div className="p-5 text-center text-gray-600">단어 목록을 불러오는 중...</div>;
    if (error) return <div className="p-5 text-center text-red-500 font-bold">오류: {error}</div>;
    if (words.length === 0) return <div className="p-5 text-center text-gray-500">이 카테고리에는 단어가 없습니다.</div>;

    return (
        <div className="p-5">
            <h2 className="text-2xl font-bold mb-6 text-indigo-600">카테고리: {selectedCategory} (단어 목록)</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {words.map((sign) => (
                    // 단일 아이템 렌더링을 SignItem 컴포넌트에 위임
                    <SignItem key={sign.signId} sign={sign} />
                ))}
            </div>
        </div>
    );
};


const SignEduPage = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);

    // 1. 카테고리 목록 조회 (/api/sign-edu/categories)
    useEffect(() => {
        axios.get(`${API_BASE_URL}/api/sign-edu/categories`)
            .then(response => {
                setCategories(response.data); // List<String> 형태
                setLoading(false);
            })
            .catch(err => {
                console.error("카테고리 목록 API 호출 실패:", err);
                setError("카테고리 목록을 불러오는 데 실패했습니다. 서버 연결 확인 필요.");
                setLoading(false);
                setCategories(["기본", "인사", "동물", "음식", "장소"]); // 실패 시 더미 카테고리 사용
            });
    }, []);

    const handleCategoryClick = (category) => {
        setSelectedCategory(category);
    };

    const handleBackToCategories = () => {
        setSelectedCategory(null);
    };

    if (loading) return <div className="p-5 text-center text-gray-600">카테고리 목록을 불러오는 중입니다...</div>;

    // 2. 단어 목록 보기 (카테고리가 선택된 경우)
    if (selectedCategory) {
        return (
            <div className="p-5 max-w-6xl mx-auto">
                <button
                    onClick={handleBackToCategories}
                    className="mb-6 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                >
                    &larr; 카테고리 목록으로 돌아가기
                </button>
                <SignWordList selectedCategory={selectedCategory} />
            </div>
        );
    }

    // 3. 카테고리 목록 보기 (초기 화면)
    return (
        <div className="p-5 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-8 text-center text-indigo-700">개인 수어 학습 (카테고리 선택)</h1>
            {error && <p className="text-center text-red-500 mb-6 font-bold">{error}</p>}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {categories.map((category, index) => (
                    <div
                        key={category} // 경고 해결: category 문자열을 key로 사용
                        onClick={() => handleCategoryClick(category)}
                        className="block bg-white p-6 rounded-xl shadow-md hover:shadow-xl cursor-pointer transition duration-300 ease-in-out transform hover:-translate-y-1"
                    >
                        <h2 className="text-xl font-semibold text-center text-gray-800">{category}</h2>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SignEduPage;

