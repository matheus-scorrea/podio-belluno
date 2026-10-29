<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'nome',
    'chave',
    'conexao_id',
    'unidade',
    'descricao',
    'consulta_sql',
    'consulta_sql_testada',
    'conexao_id_testada',
    'status',
    'ultimo_erro',
    'testado_em',
    'sincronizado_em',
])]
class Variavel extends Model
{
    use HasFactory;

    public const RASCUNHO = 'rascunho';

    public const PUBLICADA = 'publicada';

    public const INATIVA = 'inativa';

    public const STATUSES = [self::RASCUNHO, self::PUBLICADA, self::INATIVA];

    public const UNIDADES = ['%', 'R$', 'un'];

    protected $table = 'variaveis';

    protected $hidden = [
        'consulta_sql',
        'consulta_sql_testada',
    ];

    protected function casts(): array
    {
        return [
            'testado_em' => 'datetime',
            'sincronizado_em' => 'datetime',
        ];
    }

    public function conexao(): BelongsTo
    {
        return $this->belongsTo(DwConexao::class, 'conexao_id');
    }

    public function valores(): HasMany
    {
        return $this->hasMany(VariavelValor::class);
    }

    public function metas(): HasMany
    {
        return $this->hasMany(Meta::class);
    }

    public function consultaTestada(): bool
    {
        return is_string($this->consulta_sql_testada)
            && $this->consulta_sql_testada === $this->consulta_sql
            && (int) $this->conexao_id_testada === (int) $this->conexao_id
            && $this->conexao_id !== null;
    }

    public function scopePublicadas(Builder $query): Builder
    {
        return $query->where('status', self::PUBLICADA);
    }

    public function valorVigente(): ?VariavelValor
    {
        return $this->valores()
            ->where('ano', now()->year)
            ->where('mes', now()->month)
            ->first();
    }
}
