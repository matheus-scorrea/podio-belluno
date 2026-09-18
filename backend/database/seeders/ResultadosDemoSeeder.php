<?php

namespace Database\Seeders;

use App\Models\Cargo;
use App\Models\Departamento;
use App\Models\Meta;
use App\Models\User;
use App\Models\UsuarioCompetencia;
use App\Services\CompetenciaService;
use Illuminate\Database\Seeder;

/**
 * Conta local para testar Meus resultados (gráfico de barras empilhadas + linha).
 * Senha: password. Não entra no compose de produção.
 */
class ResultadosDemoSeeder extends Seeder
{
    public function run(): void
    {
        $ti = Departamento::query()->firstOrCreate(['nome' => 'TI e DEV']);
        $cargo = Cargo::query()->firstOrCreate(
            ['nome' => 'Analista de TI', 'departamento_id' => $ti->id],
        );
        $direcao = User::query()->where('is_direcao', true)->orderBy('id')->firstOrFail();

        $user = User::query()->firstOrCreate(
            ['email' => 'camila@bellunotec.com'],
            [
                'name' => 'Camila Ferreira',
                'password' => 'password',
                'departamento_id' => $ti->id,
                'cargo_id' => $cargo->id,
                'is_direcao' => false,
                'ativo' => true,
                'must_change_password' => false,
            ],
        );

        $user->update([
            'departamento_id' => $ti->id,
            'cargo_id' => $cargo->id,
            'ativo' => true,
            'must_change_password' => false,
        ]);

        $competencias = app(CompetenciaService::class);

        foreach ($this->catalogo() as $spec) {
            $meta = Meta::query()->firstOrCreate(
                [
                    'titulo' => $spec['titulo'],
                    'tipo_escopo' => 'individual',
                ],
                [
                    'descricao' => 'Meta individual de demonstração para Meus resultados.',
                    'unidade' => $spec['unidade'],
                    'sentido' => 'maior_melhor',
                    'agregacao' => 'soma',
                    'chart_tipo' => 'progress_bar',
                    'chart_cor' => $spec['cor'],
                    'valor_bonus' => $spec['bonus'],
                    'created_by' => $direcao->id,
                    'ativo' => true,
                ],
            );

            $meta->update([
                'valor_bonus' => $spec['bonus'],
                'chart_cor' => $spec['cor'],
                'ativo' => true,
            ]);
            $meta->usuarios()->sync([$user->id]);

            foreach (range(1, 9) as $mes) {
                $comp = $competencias->upsert($meta, 2026, $mes, $spec['alvo']);
                $bateu = in_array($mes, $spec['meses_batidos'], true);
                $comp->update([
                    'valor_realizado' => $bateu ? $spec['alvo'] : round($spec['alvo'] * 0.4, 2),
                ]);

                UsuarioCompetencia::query()->firstOrCreate(
                    ['user_id' => $user->id, 'ano' => 2026, 'mes' => $mes],
                    [
                        'departamento_id' => $ti->id,
                        'cargo_id' => $cargo->id,
                    ],
                );
            }
        }
    }

    /**
     * @return list<array{titulo: string, unidade: string, bonus: float, alvo: float, cor: string, meses_batidos: list<int>}>
     */
    private function catalogo(): array
    {
        return [
            [
                'titulo' => 'Relacionamento com a carteira',
                'unidade' => 'un',
                'bonus' => 180,
                'alvo' => 10,
                'cor' => '#00A8E8',
                'meses_batidos' => [1, 2, 4, 6, 8, 9],
            ],
            [
                'titulo' => 'Reuniões de evolução',
                'unidade' => 'un',
                'bonus' => 250,
                'alvo' => 8,
                'cor' => '#0F9F6E',
                'meses_batidos' => [2, 4, 5, 7, 9],
            ],
            [
                'titulo' => 'Tempo de resposta ao cliente',
                'unidade' => '%',
                'bonus' => 120,
                'alvo' => 95,
                'cor' => '#D97706',
                'meses_batidos' => [4, 6, 7, 9],
            ],
        ];
    }
}
