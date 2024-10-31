
import axios from 'axios';

export const regBldInfo = async (bldDefaultInfo, rentList) => {
    try {
        const res = await axios.post('http://localhost:3000/api/regbldinfo', {
            bldDefaultInfo,
            rentList
        });

        if (res.status === 200) {

        }
    } catch (error) {

    }
};

export const getBldInfo = async() => {
    try {
        const res = await axios.get('http://localhost:3000/api/getbldinfo');

        if (res.status === 200) {
            return res
        }
    } catch (error) {

    }
};

export const setSchedule = async (schedule) => {
    try {
        const res = await axios.post('http://localhost:3000/api/setSchedule', {
            schedule
        });

        if (res.status === 200) {

        }
    } catch (error) {

    }
};

export const getSchedule = async() => {
    try {
        const res = await axios.get('http://localhost:3000/api/getSchedule');

        if (res.status === 200) {
            return res
        }
    } catch (error) {

    }
};

export const deleteSchedule = async(id) => {
    try {
        const res = await axios.delete('http://localhost:3000/api/setSchedule', {data: { id: id.id }})

        if (res.status === 200) {
            return res
        }
    } catch (error) {

    }
};

export const login = async (userId, password) => {
    try {
        // axios로 서버에 로그인 요청
        const res = await axios.post('http://localhost:3000/api/login', {
            userId,
            password,
        });

        if (res.status === 200) {
            // 로그인 성공 시 대시보드로 리디렉션
            window.location.href = '/';
        }
    } catch (error) {
        // 오류가 발생했을 때 메시지 설정
        if (error.response && error.response.data) {
            setErrorMessage(error.response.data.message || 'Invalid credentials');
        } else {
            setErrorMessage('An error occurred. Please try again.');
        }
    }
  };

export const logout = async () => {
    await fetch('http://localhost:3000/api/logout', {
        method: 'POST',
    });
    window.location.href = '/';  // 로그아웃 후 로그인 페이지로 이동
  };

export const signup = async (userId, password, userName) => {
    try {
      const res = await axios.post('http://localhost:3000/api/signup', {
        userId,
        password,
        userName,
      });

      if (res.status === 200) {

      }
    } catch (error) {
    }
  };