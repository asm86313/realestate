'use client';  // 클라이언트 컴포넌트임을 선언

import axios from 'axios';
import { useState } from 'react';
import css from './signupForm.module.css';

// 모달 컴포넌트
export default function SignupModal({ isOpen, onClose }) {
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSignupSubmit = async (event) => {
    event.preventDefault();

    try {
      const res = await axios.post('http://localhost:3000/api/signup', {
        userid,
        password,
        name,
      });

      if (res.status === 200) {
        setSuccessMessage('회원가입 성공!');
        setErrorMessage('');
        onClose();  // 모달 닫기
      }
    } catch (error) {
      setErrorMessage('회원가입 실패. 다시 시도해주세요.');
      setSuccessMessage('');
    }
  };

  if (!isOpen) return null; // 모달이 열리지 않았을 때는 아무것도 렌더링하지 않음

  return (
    <div className={css.modalBackdrop}>
      <div className={css.modal}>
        <h2>회원가입</h2>
        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
        {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
        <form onSubmit={handleSignupSubmit}>
          <div>
            <label htmlFor="name">이름:</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="userid">아이디:</label>
            <input
              type="text"
              id="userid"
              value={userid}
              onChange={(e) => setUserid(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password">비밀번호:</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">회원가입</button>
        </form>
        <button onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}