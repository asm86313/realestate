'use client'; // 클라이언트 컴포넌트로 선언

import { useSelector, useDispatch } from 'react-redux';
import { increment, decrement, selectValue } from '../../app/slices/providerSlice';

export default function Detail() {
  const count = useSelector(selectValue);
  const dispatch = useDispatch();

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => dispatch(increment())}>Increment</button>
      <button onClick={() => dispatch(decrement())}>Decrement</button>
    </div>
  );
}