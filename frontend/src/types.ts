export type Perfil = 'direcao' | 'lider' | 'colaborador'
export type ChartTipo = 'gauge' | 'progress_bar' | 'line' | 'column' | 'marco'
export type StatusMeta = 'concluida' | 'esperado' | 'atencao' | 'abaixo'
export type TipoEscopo = 'individual' | 'cargo' | 'departamento' | 'global'
export type Sentido = 'maior_melhor' | 'menor_melhor'

export type AuthUser = {
  id: number
  name: string
  email: string
  is_direcao: boolean
  is_lider: boolean
  perfil: Perfil
  perfil_label: string
  ativo: boolean
  departamento_id: number | null
  cargo_id: number | null
  departamento: { id: number; nome: string } | null
  cargo: { id: number; nome: string } | null
}

export type DashboardKpis = {
  total_ativas: number
  concluidas: number
  desempenho_medio: number
  setores?: number
  pessoas?: number
}

export type MetaSeries = {
  label: string
  departamento_id?: number | null
  cargo_id?: number | null
  usuario_alvo_id?: number | null
  valor: number
  percentual: number
}

export type DashboardMeta = {
  id: number
  titulo: string
  descricao?: string | null
  subtitulo: string
  tipo_escopo: TipoEscopo
  valor_meta: number
  valor_realizado: number
  unidade: string
  sentido: Sentido
  percentual: number
  status: StatusMeta
  pode_lancar: boolean
  somente_leitura: boolean
  chart: { tipo: ChartTipo; cor: string }
  historico?: { em: string; valor: number }[]
  series?: MetaSeries[]
  departamentos?: { id: number; nome: string }[]
  cargos?: { id: number; nome: string; departamento_id: number }[]
  usuarios?: { id: number; name: string; cargo: string | null; departamento_id: number | null }[]
}

export type DashboardGrupoPessoa = {
  id: number
  nome: string
  cargo: string | null
  kpis: DashboardKpis
  metas: DashboardMeta[]
}

export type DashboardGrupo = {
  tipo: 'global' | 'departamento'
  id: number | null
  nome: string
  subtitulo: string
  kpis: DashboardKpis
  metas_setor: DashboardMeta[]
  pessoas: DashboardGrupoPessoa[]
}

export type DashboardResponse = {
  kpis: DashboardKpis
  metas: DashboardMeta[]
  grupos?: DashboardGrupo[]
  visao: string
  ano: number
  mes: number
}

export type MetaLancavel = {
  id: number
  titulo: string
  subtitulo: string
  unidade: string
  valor_meta: number
  valor_realizado?: number
  comparativa: boolean
  chart_tipo: ChartTipo
  tipo_escopo: TipoEscopo
  graos: {
    label: string
    departamento_id: number | null
    cargo_id: number | null
    usuario_alvo_id: number | null
  }[]
}

export type Departamento = {
  id: number
  nome: string
  cargo_lider_id: number | null
  cargo_lider?: { id: number; nome: string } | null
  ativo: boolean
  cargos?: Cargo[]
}

export type Cargo = {
  id: number
  nome: string
  departamento_id: number
  ativo: boolean
  departamento?: Departamento
}

export type FechamentoItem = {
  meta_id: number
  titulo: string
  tipo_escopo: TipoEscopo
  percentual: number
  valor_bonus: number
}

export type FechamentoUsuario = {
  id: number
  name: string
  departamento: string | null
  departamento_id: number | null
  cargo: string | null
  bonus_total: number
  itens: FechamentoItem[]
}

export type FechamentoResponse = {
  ano: number
  mes: number
  pessoas: number
  metas_batidas: number
  total_bonus: number
  usuarios: FechamentoUsuario[]
}

export type MetaCompetencia = {
  id: number
  ano: number
  mes: number
  valor_meta: number
  valor_realizado: number
}

export type MetaDetail = {
  id: number
  titulo: string
  descricao: string | null
  ano: number
  mes: number
  tipo_escopo: TipoEscopo
  valor_meta: number
  valor_bonus?: number
  unidade: string
  sentido: Sentido
  chart_tipo: ChartTipo
  chart_cor: string
  usuarios: AuthUser[]
  cargos: Cargo[]
  departamentos: Departamento[]
  competencias?: MetaCompetencia[]
}
