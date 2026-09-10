<?php

namespace Database\Seeders;

use App\Models\Meta;
use App\Models\User;
use App\Services\CompetenciaService;
use App\Services\ProgressoService;
use App\Support\MetasMarco;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class OkrBancoSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/okr_2026.json');
        if (Meta::query()->exists()) {
            return;
        }
        $payload = json_decode(File::get($path), true, flags: JSON_THROW_ON_ERROR);
        $direcao = User::query()->where('email', 'direcao@bellunotec.com')->firstOrFail();
        $progresso = app(ProgressoService::class);
        $competencias = app(CompetenciaService::class);

        $departamentos = \App\Models\Departamento::query()->pluck('id', 'nome');
        $usuarios = User::query()->pluck('id', 'email');
        $catalogo = [];

        foreach ($payload['metas'] as $row) {
            $chave = implode('|', [
                mb_strtolower($row['titulo']),
                $row['tipo_escopo'],
                $row['departamento'] ?? '',
                $row['usuario_email'] ?? '',
            ]);

            if (! isset($catalogo[$chave])) {
                $ehMarco = ($row['chart_tipo'] ?? '') === 'marco' || MetasMarco::ehTitulo($row['titulo']);
                $meta = Meta::query()->create([
                    'titulo' => $row['titulo'],
                    'descricao' => $ehMarco
                        ? 'Marco de entrega do OKR Banco Bônus 2026. É concluído quando a ação for disparada.'
                        : 'Indicador do OKR Banco Bônus 2026. O alvo é definido por competência.',
                    'tipo_escopo' => $row['tipo_escopo'],
                    'unidade' => $ehMarco ? 'marco' : $row['unidade'],
                    'sentido' => $ehMarco ? 'maior_melhor' : $row['sentido'],
                    'agregacao' => $ehMarco ? 'ultimo' : ($row['unidade'] === '%' ? 'media' : 'soma'),
                    'chart_tipo' => $ehMarco ? 'marco' : $row['chart_tipo'],
                    'chart_cor' => $row['chart_cor'],
                    'valor_bonus' => $row['valor_bonus'] ?? 0,
                    'created_by' => $direcao->id,
                ]);

                if ($row['tipo_escopo'] === 'departamento' && ! empty($row['departamento'])) {
                    $deptId = $departamentos[$row['departamento']] ?? null;
                    if ($deptId) {
                        $meta->departamentos()->sync([$deptId]);
                    }
                }

                if ($row['tipo_escopo'] === 'individual' && ! empty($row['usuario_email'])) {
                    $userId = $usuarios[$row['usuario_email']] ?? null;
                    if ($userId) {
                        $meta->usuarios()->sync([$userId]);
                    }
                }

                $catalogo[$chave] = $meta;
            }

            $meta = $catalogo[$chave];
            $ehMarco = $meta->isMarco();
            $alvoOriginal = (float) $row['valor_meta'];
            $alvo = $ehMarco ? 1.0 : $alvoOriginal;
            $competencias->upsert($meta, (int) $row['ano'], (int) $row['mes'], $alvo);

            if ($row['realizado'] === null) {
                continue;
            }

            $ultimoDia = Carbon::create((int) $row['ano'], (int) $row['mes'], 1)->endOfMonth()->toDateString();
            $autorId = $usuarios[$row['usuario_email'] ?? ''] ?? $direcao->id;
            $autor = User::query()->find($autorId) ?? $direcao;
            $realizado = $ehMarco
                ? MetasMarco::realizadoComoMarco((float) $row['realizado'], $alvoOriginal)
                : $row['realizado'];

            $progresso->lancar($autor, $meta, [
                'valor_realizado' => $realizado,
                'data_evento' => $ultimoDia,
                'observacao' => 'Importado da planilha 2026 OKR Banco Bônus.',
            ]);
        }

        foreach ($catalogo as $meta) {
            if ($meta->isMarco()) {
                MetasMarco::aplicar($meta);
            }
        }
    }
}
