import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ProgressPage from './pages/ProgressPage';
import ResultPage from './pages/ResultPage';

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <h1 className="text-xl font-bold text-indigo-600">Mini-Muse</h1>
          <span className="text-sm text-gray-500">AI Web App Generator</span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/progress/:taskId" element={<ProgressPage />} />
          <Route path="/result/:taskId" element={<ResultPage />} />
        </Routes>
      </main>
    </div>
  );
}
