<?php

namespace App\Services;

use App\Models\DwConexao;
use App\Models\Meta;
use App\Models\MetaCompetencia;
use App\Models\Variavel;
use App\Models\VariavelValor;
use App\Support\DwConsultaSql;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use PDO;
use Throwable;

class DwIndicadorService
{
    /**
     * @return array{valor: float, ano: int, mes: int}
     */
    public function testar(string $sql, ?DwConexao $conexao = null): array
    {
        $ano = (int) now()->year;
        $mes = (int) now()->month;
        $valor = $this->executar($sql, $ano, $mes, $conexao);

        return ['valor' => $valor, 'ano' => $ano, 'mes' => $mes];
    }

    public function testarConexao(DwConexao $conexao): void
    {
        $pdo = $this->pdo($conexao);
        $pdo->query('SELECT 1');
    }

    public function mensagemPublica(Throwable $e): string
    {
        return $this->mensagemErro($e);
    }

    /**
     * @return array{ok: int, erro: int}
     */
    public function sincronizarPublicadas(): array
    {
        $ano = (int) now()->year;
        $mes = (int) now()->month;
        $this->congelarMesesAnteriores($ano, $mes);

        $ok = 0;
        $erro = 0;

        foreach (Variavel::query()->publicadas()->with('conexao')->orderBy('id')->get() as $variavel) {
            try {
                $valor = $this->executar($variavel->consulta_sql, $ano, $mes, $variavel->conexao);
                $this->gravarVigente($variavel, $ano, $mes, $valor);
                $this->propagarParaMetas($variavel, $ano, $mes, $valor);
                $variavel->update([
                    'ultimo_erro' => null,
                    'sincronizado_em' => now(),
                ]);
                $ok++;
            } catch (Throwable $e) {
                $variavel->update(['ultimo_erro' => $this->mensagemErro($e)]);
                $erro++;
            }
        }

        return ['ok' => $ok, 'erro' => $erro];
    }

    public function executar(string $sql, int $ano, int $mes, ?DwConexao $conexao = null): float
    {
        $sql = DwConsultaSql::normalizar($sql);
        $pdo = $this->pdo($conexao);
        $statement = $pdo->prepare($sql);
        if (str_contains($sql, ':ano')) {
            $statement->bindValue(':ano', $ano, PDO::PARAM_INT);
        }
        if (str_contains($sql, ':mes')) {
            $statement->bindValue(':mes', $mes, PDO::PARAM_INT);
        }
        $statement->execute();
        $linhas = $statement->fetchAll(PDO::FETCH_NUM);

        if (count($linhas) > 1) {
            throw new InvalidArgumentException('A consulta deve devolver uma única linha.');
        }

        if ($linhas === []) {
            return 0.0;
        }

        $valor = $linhas[0][0] ?? null;
        if (! is_numeric($valor)) {
            throw new InvalidArgumentException('A consulta deve devolver um valor numérico.');
        }

        return round((float) $valor, 2);
    }

    public function marcarTesteOk(Variavel $variavel): void
    {
        $variavel->update([
            'consulta_sql_testada' => $variavel->consulta_sql,
            'conexao_id_testada' => $variavel->conexao_id,
            'testado_em' => now(),
            'ultimo_erro' => null,
        ]);
    }

    public function marcarTesteErro(Variavel $variavel, string $mensagem): void
    {
        $variavel->update(['ultimo_erro' => $mensagem]);
    }

    private function congelarMesesAnteriores(int $ano, int $mes): void
    {
        VariavelValor::query()
            ->where('congelado', false)
            ->where(function ($query) use ($ano, $mes) {
                $query->where('ano', '<', $ano)
                    ->orWhere(function ($q) use ($ano, $mes) {
                        $q->where('ano', $ano)->where('mes', '<', $mes);
                    });
            })
            ->update(['congelado' => true]);
    }

    private function gravarVigente(Variavel $variavel, int $ano, int $mes, float $valor): void
    {
        $atual = VariavelValor::query()->firstOrNew([
            'variavel_id' => $variavel->id,
            'ano' => $ano,
            'mes' => $mes,
        ]);

        if ($atual->exists && $atual->congelado) {
            return;
        }

        $atual->valor = $valor;
        $atual->congelado = false;
        $atual->save();
    }

    private function propagarParaMetas(Variavel $variavel, int $ano, int $mes, float $valor): void
    {
        $metas = Meta::query()->where('variavel_id', $variavel->id)->get();
        foreach ($metas as $meta) {
            if (! $meta->aceitaOrigemVariavel()) {
                continue;
            }

            $competencia = MetaCompetencia::query()
                ->where('meta_id', $meta->id)
                ->where('ano', $ano)
                ->where('mes', $mes)
                ->first();
            if ($competencia === null) {
                continue;
            }

            $competencia->valor_realizado = $valor;
            $competencia->save();
        }
    }

    public function mensagemErro(Throwable $e): string
    {
        $mensagem = trim($e->getMessage());
        $mensagem = preg_replace('/password=[^;\s]*/i', 'password=***', $mensagem) ?? $mensagem;

        return $mensagem !== '' ? mb_substr($mensagem, 0, 500) : 'Falha ao consultar o data warehouse.';
    }

    private function pdo(?DwConexao $conexao): PDO
    {
        if ($conexao === null) {
            throw new InvalidArgumentException('Selecione uma conexão de banco para esta variável.');
        }

        if ($conexao->driver === 'sqlite' && in_array($conexao->database, [':memory:', ''], true)) {
            return DB::connection('dw')->getPdo();
        }

        $nome = 'dw_conexao_'.($conexao->id ?: 'tmp_'.spl_object_id($conexao));
        config(["database.connections.$nome" => $conexao->configLaravel()]);
        DB::purge($nome);

        return DB::connection($nome)->getPdo();
    }
}
