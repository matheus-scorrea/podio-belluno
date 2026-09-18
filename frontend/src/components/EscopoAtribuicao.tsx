import CorporateFareOutlinedIcon from '@mui/icons-material/CorporateFareOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined'
import { Chip, Stack, Tooltip } from '@mui/material'
import { escopoAtribuicao, escopoLabel } from '../lib/labels'
import { chipFilledSx, chipOutlinedSx } from '../theme/chips'
import type { TipoEscopo } from '../types'

type Props = {
  tipo: TipoEscopo | string
  departamentos?: { nome: string }[]
  cargos?: { nome: string }[]
  usuarios?: { name: string }[]
  align?: 'start' | 'end'
}

function iconeEscopo(tipo: TipoEscopo | string) {
  switch (tipo) {
    case 'individual':
      return <PersonOutlinedIcon />
    case 'cargo':
      return <WorkOutlineOutlinedIcon />
    case 'departamento':
      return <CorporateFareOutlinedIcon />
    default:
      return <PublicOutlinedIcon />
  }
}

export function EscopoAtribuicao({ tipo, departamentos, cargos, usuarios, align = 'start' }: Props) {
  const atribuicao = escopoAtribuicao({ tipo_escopo: tipo, departamentos, cargos, usuarios })

  return (
    <Stack
      spacing={0.5}
      sx={{
        alignItems: align === 'end' ? 'flex-end' : 'flex-start',
        minWidth: 0,
      }}
    >
      <Chip
        size="small"
        variant="outlined"
        icon={iconeEscopo(tipo)}
        label={escopoLabel(tipo)}
        sx={chipOutlinedSx}
      />
      {atribuicao &&
        (atribuicao.resumo === atribuicao.completo ? (
          <Chip
            size="small"
            label={atribuicao.resumo}
            sx={{ ...chipFilledSx, maxWidth: 200 }}
          />
        ) : (
          <Tooltip title={atribuicao.completo}>
            <Chip
              size="small"
              label={atribuicao.resumo}
              sx={{ ...chipFilledSx, maxWidth: 200 }}
            />
          </Tooltip>
        ))}
    </Stack>
  )
}
