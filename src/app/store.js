import { configureStore } from '@reduxjs/toolkit';
import { providerSlice } from './slices/providerSlice'; // 여러분의 slice 파일 경로
import { storeSlice } from './slices/storeSlice';

export const store = configureStore({
  reducer: {
    provider: providerSlice.reducer,
    storeSlice: storeSlice.reducer,
  },
});
