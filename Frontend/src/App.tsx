import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './components/PrivateRoute';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './pages/DashboardLayout';
import InicioPage from './pages/InicioPage';
import MovimientosPage from './pages/MovimientosPage';
import TransferenciaPage from './pages/TransferenciaPage';
import PerfilPage from './pages/PerfilPage';
import AdminPage from './pages/AdminPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<PrivateRoute allowedRoles={['user', 'admin']} />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<InicioPage />} />
            <Route path="transferir" element={<TransferenciaPage />} />
            <Route path="movimientos" element={<MovimientosPage />} />
            <Route path="perfil" element={<PerfilPage />} />
          </Route>
        </Route>

        <Route element={<PrivateRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
