
import axios from 'axios';

export const regBldInfo = async (bldDefaultInfo, rentList) => {
    try {
        const res = await axios.post('http://localhost:3000/api/regbldinfo', {
            bldDefaultInfo,
            rentList
        });
        if (res.status === 200) {
            console.log('📢 API 요청 성공 :', res);
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const delBldInfo = async (id) => {
    try {
        const res = await axios.delete('http://localhost:3000/api/regbldinfo', {
            data: {
                id,
            }
        });

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

let controller = null; // AbortController를 저장할 변수

export const getBldInfo = async (a) => {
    // 기존 요청이 있다면 취소
    if (controller) {
        controller.abort();
    }

    // 새로운 요청을 위해 AbortController 생성
    controller = new AbortController();

    try {
        const res = await axios.get('http://localhost:3000/api/getbldinfo', {
            signal: controller.signal, // ✅ AbortController 적용
        });

        if (res.status === 200) {
            console.log('📢 API 요청 성공:', a);
            return res;
        }
    } catch (error) {
        if (axios.isCancel(error)) {
            console.log('📢 API 요청이 취소됨:', a);
        } else {
            console.error('❌ API 요청 실패:', a);
        }
    } finally {
        // 요청이 끝나면 controller 초기화
        controller = null;
    }
};

export const regSchedule = async (schedule) => {
    try {
        const res = await axios.post('http://localhost:3000/api/regSchedule', {
            schedule
        });

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const getSchedule = async() => {
    try {
        const res = await axios.get('http://localhost:3000/api/getSchedule');

        if (res.status === 200) {
            return res
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const deleteSchedule = async(id) => {
    try {
        const res = await axios.delete('http://localhost:3000/api/regSchedule', {
            data: {
                id
            }
        });

        if (res.status === 200) {
            return res
        }

    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const login = async (email, password) => {
    try {
        // axios로 서버에 로그인 요청
        const res = await axios.post('http://localhost:3000/api/login', {
            email,
            password,
        });

        if (res.status === 200) {
            return res
        }
    } catch (error) {
        // 오류가 발생했을 때 메시지 설정
    }
};

export const getUser = async () => {
    try {
        // axios로 서버에 로그인 요청
        const res = await axios.get('http://localhost:3000/api/login');

        if (res.status === 200) {
            return res
        }
    } catch (error) {
        // 오류가 발생했을 때 메시지 설정
    }
};

export const logout = async () => {
    try {
        const res = await axios.post('http://localhost:3000/api/logout');

        if (res.status === 200) {
            return window.location.href = '/';
        }
    } catch (error) {
        console.error('로그아웃 실패:', error);
    }
};

export const signup = async (userId, userName, email, password) => {
    try {
      const res = await axios.post('http://localhost:3000/api/signup', {
        userId,
        password,
        userName,
        email
      });

      if (res.status === 200) {
        return res;
      }
    } catch (error) {
        console.error('회원가입 실패:', error);
    }
};