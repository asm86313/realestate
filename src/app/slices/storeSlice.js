import { createSlice } from '@reduxjs/toolkit';

export const storeSlice = createSlice({
  name: 'storeSlice',
  initialState: {
    buildings: [], // 초기 상태
    contracts: [],
    schedule: [],
    userData: null,
  },

  reducers: {
    setBuildings: (state, action) => {
      state.buildings = action.payload
    },
    setContracts: (state, action) => {
      state.contracts = action.payload
    },
    setSchedule: (state, action) => {
      state.schedule = action.payload
    },
    setUserData: (state, action) => {
      state.userData = action.payload
    }
  },
});

// 액션 생성자 내보내기
export const { setBuildings, setContracts, setSchedule, setUserData } = storeSlice.actions;

// 선택자 내보내기
export const buildingsState = (state) => state.storeSlice.buildings;
export const contractsState = (state) => state.storeSlice.contracts;
export const scheduleState = (state) => state.storeSlice.schedule;
export const userData = (state) => state.storeSlice.userData;

export default storeSlice.reducer;
