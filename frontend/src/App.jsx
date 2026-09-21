import { Navigate, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import PlaceDetail from './pages/PlaceDetail.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/place/:id" element={<PlaceDetail />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
