import { Navigate, Route, Routes } from 'react-router-dom'
import { SessionGate } from './layout/SessionGate'
import { ContaPage } from './pages/ContaPage'
import { DashboardPage } from './pages/DashboardPage'
import { DepartamentoFormPage } from './pages/DepartamentoFormPage'
import { DepartamentosPage } from './pages/DepartamentosPage'
import { FechamentoPage } from './pages/FechamentoPage'
import { LoginPage } from './pages/LoginPage'
import { MeusResultadosPage } from './pages/MeusResultadosPage'
import { MetasListPage } from './pages/MetasListPage'
import { MetaStepperPage } from './pages/MetaStepperPage'
import { PrimeiroAcessoPage } from './pages/PrimeiroAcessoPage'
import { UsuarioFormPage } from './pages/UsuarioFormPage'
import { UsuariosPage } from './pages/UsuariosPage'
import { ConexaoFormPage } from './pages/ConexaoFormPage'
import { ConexoesPage } from './pages/ConexoesPage'
import { IndicadoresPage } from './pages/IndicadoresPage'
import { VariavelStepperPage } from './pages/VariavelStepperPage'

export default function App() {
  return (
    <SessionGate>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/primeiro-acesso" element={<PrimeiroAcessoPage />} />
        <Route path="/conta" element={<ContaPage />} />
        <Route path="/meus-resultados" element={<MeusResultadosPage />} />
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
        <Route path="/indicadores" element={<IndicadoresPage />} />
        <Route path="/indicadores/nova" element={<VariavelStepperPage />} />
        <Route path="/indicadores/conexoes" element={<ConexoesPage />} />
        <Route path="/indicadores/conexoes/nova" element={<ConexaoFormPage />} />
        <Route path="/indicadores/conexoes/:id/editar" element={<ConexaoFormPage />} />
        <Route path="/indicadores/:id/editar" element={<VariavelStepperPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionGate>
  )
}
