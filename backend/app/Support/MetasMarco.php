<?php

namespace App\Support;

use App\Models\Meta;
use Carbon\Carbon;

class MetasMarco
{
    /**
     * Entregas pontuais do OKR Banco: o indicador é feito/não feito, não um volume mensal.
     *
     * @return list<string>
     */
    public static function titulos(): array
    {
        return [
            'Atendimento chat v 1.0',
            'Ativar Belluno.com.br (site e e-mails)',
            'Ativar whatsapp do comercial no Activecampaign',
            'Ativar whatsapp no CRM',
            'Automação contratos ganhos no simples implantada',
            'Cloud IAnalista',
            'Concluir dados retroativos na dashboard',
            'Criar app para cadastro, configuração e apuração dos bônus do apoio',
            'Criar Dashboard e controle de Metas (Simples, Active e Tiflux)',
            'Evolução e resolver Bugs IAnalista',
            'Implantar IAnalista',
            'Melhorar entrega de Ligações do Webphone',
            'Mockup Painel do RH',
            'Otimizar envio do relatório de indicadores mensais',
            'Programa de indicações',
            'Projetos TI e DEV',
            'Relatório e notificação de Call Back',
            'Renegociação de contrato com TEIF',
            'Resolver Bugs Atendimento chat 1.0',
            'Resolver Bugs módulo serviços ativos no Simples',
            'Resolver Bugs Webphone Simples',
            'Resolver problema do modelo de IA e de transcrição da IAnalista',
            'Show na confra',
            'Trocar domínio da API do Simples',
        ];
    }

    public static function ehTitulo(string $titulo): bool
    {
        return in_array($titulo, self::titulos(), true);
    }

    public static function realizadoComoMarco(?float $realizado, float $alvo): float
    {
        if ($realizado === null) {
            return 0.0;
        }
        if ($alvo <= 0) {
            return $realizado > 0 ? 1.0 : 0.0;
        }

        return $realizado >= $alvo ? 1.0 : 0.0;
    }

    public static function aplicar(Meta $meta): void
    {
        $meta->load(['competencias', 'lancamentos']);

        foreach ($meta->lancamentos as $lancamento) {
            $evento = Carbon::parse($lancamento->data_evento);
            $comp = $meta->competencias->first(
                fn ($c) => (int) $c->ano === $evento->year && (int) $c->mes === $evento->month
            );
            $alvo = (float) ($comp?->valor_meta ?? 1);
            $lancamento->update([
                'valor_realizado' => self::realizadoComoMarco((float) $lancamento->valor_realizado, $alvo),
            ]);
        }

        foreach ($meta->competencias as $competencia) {
            $competencia->update([
                'valor_realizado' => self::realizadoComoMarco((float) $competencia->valor_realizado, (float) $competencia->valor_meta),
                'valor_meta' => 1,
            ]);
        }

        $feito = false;
        foreach ($meta->competencias->sortBy(fn ($c) => sprintf('%04d-%02d', $c->ano, $c->mes)) as $competencia) {
            if ((float) $competencia->valor_realizado >= 1) {
                $feito = true;
            } elseif ($feito) {
                $competencia->update(['valor_realizado' => 1]);
            }
        }

        $meta->update([
            'chart_tipo' => 'marco',
            'unidade' => 'marco',
            'sentido' => 'maior_melhor',
            'agregacao' => 'ultimo',
        ]);
    }

    public static function converterCatalogo(): int
    {
        $convertidas = 0;
        Meta::query()->whereIn('titulo', self::titulos())->get()->each(function (Meta $meta) use (&$convertidas) {
            self::aplicar($meta);
            $convertidas++;
        });

        return $convertidas;
    }
}
