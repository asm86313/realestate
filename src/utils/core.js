
import axios from 'axios';
import apiClient from '@/utils/apiClient';

export const regBldInfo = async (bldDefaultInfo, rentList) => {
    try {
        const res = await apiClient.post('/api/regbldinfo', {
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
        const res = await apiClient.delete('/api/regbldinfo', {
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

export const getBldInfo = async () => {
    // 기존 요청이 있다면 취소
    if (controller) {
        controller.abort();
    }

    // 새로운 요청을 위해 AbortController 생성
    controller = new AbortController();

    try {
        const res = await apiClient.get('/api/getbldinfo', {
            signal: controller.signal, // ✅ AbortController 적용
        });

        if (res.status === 200) {
            console.log('📢 API 요청 성공:', res);
            return res;
        }
    } catch (error) {
        if (axios.isCancel(error)) {
            console.log('📢 API 요청이 취소됨:', error);
        } else {
            console.error('❌ API 요청 실패:', error);
        }
    } finally {
        // 요청이 끝나면 controller 초기화
        controller = null;
    }
};

export const regSchedule = async (schedule) => {
    try {
        const res = await apiClient.post('/api/regSchedule', {
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
        const res = await apiClient.get('/api/getSchedule');

        if (res.status === 200) {
            return res
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const deleteSchedule = async(id) => {
    try {
        const res = await apiClient.delete('/api/regSchedule', {
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

export const getLedger = async (bldId) => {
    try {
        const res = await apiClient.get('/api/ledger', {
            params: { bldId },
        });

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const getLedgerByDate = async (date) => {
    try {
        const res = await apiClient.get('/api/ledger', {
            params: { date },
        });

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const regLedger = async (entry) => {
    try {
        const res = await apiClient.post('/api/ledger', {
            entry,
        });

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const delLedger = async (id) => {
    try {
        const res = await apiClient.delete('/api/ledger', {
            data: { id },
        });

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const getLedgerTemplates = async () => {
    try {
        const res = await apiClient.get('/api/ledgerTemplates');

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const regLedgerTemplate = async (template) => {
    try {
        const res = await apiClient.post('/api/ledgerTemplates', {
            template,
        });

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const delLedgerTemplate = async (id) => {
    try {
        const res = await apiClient.delete('/api/ledgerTemplates', {
            data: { id },
        });

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const getLedgerReports = async (bldId) => {
    try {
        const res = await apiClient.get('/api/ledgerReports', {
            params: { bldId },
        });

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const saveLedgerReport = async (report) => {
    try {
        const res = await apiClient.post('/api/ledgerReports', {
            report,
        });

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const delLedgerReport = async (id) => {
    try {
        const res = await apiClient.delete('/api/ledgerReports', {
            data: { id },
        });

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const getBankAccounts = async (bldId) => {
    try {
        const res = await apiClient.get('/api/bankAccounts', {
            params: { bldId },
        });

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const saveBankAccount = async (account) => {
    try {
        const res = await apiClient.post('/api/bankAccounts', {
            account,
        });

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const delBankAccount = async (id) => {
    try {
        const res = await apiClient.delete('/api/bankAccounts', {
            data: { id },
        });

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const getScheduleTemplates = async () => {
    try {
        const res = await apiClient.get('/api/scheduleTemplates');

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const regScheduleTemplate = async (template) => {
    try {
        const res = await apiClient.post('/api/scheduleTemplates', {
            template,
        });

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

export const delScheduleTemplate = async (id) => {
    try {
        const res = await apiClient.delete('/api/scheduleTemplates', {
            data: { id },
        });

        if (res.status === 200) {
            return res;
        }
    } catch (error) {
        console.error('❌ API 요청 실패:', error);
    }
};

// 로그인/회원가입/로그아웃은 src/components/settings/settings.js에서
// Supabase 클라이언트(src/lib/supabase.js)를 직접 사용하는 이메일 OTP 방식으로 처리한다.