import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardPage } from './pages/DashboardPage'
import { DepartamentoFormPage } from './pages/DepartamentoFormPage'
import { DepartamentosPage } from './pages/DepartamentosPage'
import { FechamentoPage } from './pages/FechamentoPage'
import { LoginPage } from './pages/LoginPage'
import { MetasListPage } from './pages/MetasListPage'
import { MetaStepperPage } from './pages/MetaStepperPage'
import { UsuarioFormPage } from './pages/UsuarioFormPage'
import { UsuariosPage } from './pages/UsuariosPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<DashboardPage />} />
      <Route path="/metas" element={<MetasListPage />} />
      <Route path="/metas/nova" element={<MetaStepperPage />} />
      <Route path="/metas/:id/editar" element={<MetaStepperPage />} />
      <Route path="/departamentos" element={<DepartamentosPage />} />
      <Route path="/departamentos/novo" element={<DepartamentoFormPage />} />
      <Route path="/departamentos/:id/editar" element={<DepartamentoFormPage />} />
      <Route path="/cargos" element={<Navigate to="/departamentos" replace />} />
      <Route path="/cargos/*" element={<Navigate to="/departamentos" replace />} />
      <Route path="/usuarios" element={<UsuariosPage />} />
      <Route path="/usuarios/novo" element={<UsuarioFormPage />} />
      <Route path="/usuarios/:id/editar" element={<UsuarioFormPage />} />
      <Route path="/fechamento" element={<FechamentoPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
