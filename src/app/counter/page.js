// app/page.js
import CounterPage from '../../components/counter/counter'; // 클라이언트 컴포넌트 경로를 확인하세요

export default function page() {
  return (
    <div>
      <h1>My Page</h1>
      <CounterPage /> {/* 클라이언트 컴포넌트를 호출 */}
    </div>
  );
}
