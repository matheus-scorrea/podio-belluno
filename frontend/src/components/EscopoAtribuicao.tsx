import CorporateFareOutlinedIcon from '@mui/icons-material/CorporateFareOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import WorkOutlineOutlinedIcon from '@mui/icons-material/WorkOutlineOutlined'
import { Chip, Stack, Tooltip, Typography } from '@mui/material'
import { escopoAtribuicao, escopoLabel } from '../lib/labels'
import { chipFilledSx, chipOutlinedSx } from '../theme/chips'
import type { TipoEscopo } from '../types'

type Props = {
  tipo: TipoEscopo | string
  departamentos?: { nome: string }[]
  cargos?: { nome: string }[]
  usuarios?: { name: string }[]
  pessoas?: { id: number; name: string }[]
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

export function EscopoAtribuicao({ tipo, departamentos, cargos, usuarios, pessoas, align = 'start' }: Props) {
  const atribuicao = escopoAtribuicao({ tipo_escopo: tipo, departamentos, cargos, usuarios })
  const chipEscopo = (
    <Chip
      size="small"
      variant="outlined"
      icon={iconeEscopo(tipo)}
      label={escopoLabel(tipo)}
      sx={{ ...chipOutlinedSx, cursor: pessoas ? 'default' : undefined }}
    />
  )

  return (
    <Stack
      spacing={0.5}
      sx={{
        alignItems: align === 'end' ? 'flex-end' : 'flex-start',
        minWidth: 0,
      }}
    >
      {pessoas ? (
        <Tooltip
          arrow
          placement="bottom-start"
          enterDelay={200}
          title={
            <Stack spacing={0.5} sx={{ py: 0.25, maxHeight: 280, overflowY: 'auto' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                {pessoas.length === 1 ? '1 pessoa neste escopo' : `${pessoas.length} pessoas neste escopo`}
              </Typography>
              {pessoas.length === 0 ? (
                <Typography variant="caption" component="div">
                  Ninguém enquadrado neste recorte.
                </Typography>
              ) : (
                pessoas.map((pessoa) => (
                  <Typography key={pessoa.id} variant="caption" component="div">
                    {pessoa.name}
                  </Typography>
                ))
              )}
            </Stack>
          }
        >
          {chipEscopo}
        </Tooltip>
      ) : (
        chipEscopo
      )}
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
