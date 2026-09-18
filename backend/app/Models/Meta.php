<?php

namespace App\Models;

use App\Support\IndicadorStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'titulo',
    'descricao',
    'tipo_escopo',
    'unidade',
    'sentido',
    'agregacao',
    'chart_tipo',
    'chart_cor',
    'valor_bonus',
    'modo_bonus',
    'bonus_piso_percentual',
    'bonus_teto_percentual',
    'bonus_por_unidade_extra',
    'niveis_comissao',
    'marco_por_pessoa',
    'created_by',
    'ativo',
])]
class Meta extends Model
{
    use HasFactory, SoftDeletes;

    protected $hidden = [
        'ordem_exibicao',
    ];

    protected function casts(): array
    {
        return [
            'ativo' => 'boolean',
            'valor_bonus' => 'decimal:2',
            'bonus_piso_percentual' => 'decimal:1',
            'bonus_teto_percentual' => 'decimal:1',
            'bonus_por_unidade_extra' => 'decimal:2',
            'niveis_comissao' => 'array',
            'marco_por_pessoa' => 'boolean',
        ];
    }

    public function criador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function usuarios(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'meta_usuario', 'meta_id', 'usuario_id');
    }

    public function cargos(): BelongsToMany
    {
        return $this->belongsToMany(Cargo::class, 'meta_cargo');
    }

    public function departamentos(): BelongsToMany
    {
        return $this->belongsToMany(Departamento::class, 'meta_departamento');
    }

    public function lancamentos(): HasMany
    {
        return $this->hasMany(MetaLancamento::class);
    }

    public function competencias(): HasMany
    {
        return $this->hasMany(MetaCompetencia::class);
    }

    public function isComparativa(): bool
    {
        return $this->chart_tipo === 'column';
    }

    public function isMarco(): bool
    {
        return $this->chart_tipo === 'marco';
    }

    public function isComissao(): bool
    {
        return $this->chart_tipo === 'comissao';
    }

    public function isQuantitativa(): bool
    {
        return ! $this->isMarco() && ! $this->isComissao();
    }

    public function isPorPessoa(): bool
    {
        return (bool) $this->marco_por_pessoa && ($this->isMarco() || $this->isQuantitativa());
    }

    public function isMarcoPorPessoa(): bool
    {
        return $this->isMarco() && $this->isPorPessoa();
    }

    public function isQuantitativaPorPessoa(): bool
    {
        return $this->isQuantitativa() && $this->isPorPessoa();
    }

    public function isPorGrao(): bool
    {
        return $this->isComparativa() || $this->isComissao() || $this->isPorPessoa();
    }

    public function modoBonus(): string
    {
        if (! $this->isQuantitativa() || $this->sentido === 'menor_melhor') {
            return 'fixo';
        }

        $modo = (string) ($this->modo_bonus ?: 'fixo');

        return in_array($modo, ['fixo', 'linear', 'unidade'], true) ? $modo : 'fixo';
    }

    public function atingimentoSemTeto(): bool
    {
        return $this->modoBonus() !== 'fixo';
    }

    public function pisoBonus(): float
    {
        if ($this->modoBonus() === 'linear') {
            return (float) ($this->bonus_piso_percentual ?? 100);
        }

        return 100.0;
    }

    public function enquadra(User $user): bool
    {
        if ($user->is_direcao) {
            return true;
        }

        if ($this->tipo_escopo === 'global') {
            return true;
        }

        if ($user->isLider()) {
            return $this->noSetorDe($user);
        }

        $this->loadMissing(['usuarios', 'cargos', 'departamentos']);

        return $this->usuarios->contains('id', $user->id)
            || $this->cargos->contains('id', $user->cargo_id)
            || $this->departamentos->contains('id', $user->departamento_id);
    }

    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->is_direcao) {
            return $query;
        }

        if ($user->isLider()) {
            return $query->doSetor($user->departamento_id);
        }

        return $query->where(function (Builder $q) use ($user) {
            $q->where('tipo_escopo', 'global')
                ->orWhereHas('usuarios', fn (Builder $inner) => $inner->where('users.id', $user->id))
                ->orWhereHas('cargos', fn (Builder $inner) => $inner->where('cargos.id', $user->cargo_id))
                ->orWhereHas('departamentos', fn (Builder $inner) => $inner->where('departamentos.id', $user->departamento_id));
        });
    }

    public function scopeDoSetor(Builder $query, ?int $departamentoId): Builder
    {
        if (! $departamentoId) {
            return $query->whereRaw('0 = 1');
        }

        return $query->where(function (Builder $q) use ($departamentoId) {
            $q->where('tipo_escopo', 'global')
                ->orWhereHas('departamentos', fn (Builder $d) => $d->where('departamentos.id', $departamentoId))
                ->orWhereHas('cargos', fn (Builder $c) => $c->where('departamento_id', $departamentoId))
                ->orWhereHas('usuarios', fn (Builder $u) => $u->where('departamento_id', $departamentoId));
        });
    }

    public function noSetorDe(User $user): bool
    {
        $deptId = $user->departamento_id;
        if (! $deptId) {
            return false;
        }

        $this->loadMissing(['usuarios', 'cargos', 'departamentos']);

        return $this->departamentos->contains('id', $deptId)
            || $this->cargos->contains(fn ($c) => (int) $c->departamento_id === (int) $deptId)
            || $this->usuarios->contains(fn ($u) => (int) $u->departamento_id === (int) $deptId);
    }

    public function scopeCompetencia(Builder $query, int $ano, int $mes): Builder
    {
        return $query->where('ativo', true)
            ->whereHas('competencias', fn (Builder $q) => $q->where('ano', $ano)->where('mes', $mes))
            ->with([
                'competencias' => fn ($q) => $q->where('ano', $ano)->where('mes', $mes),
                'lancamentos' => fn ($q) => $q->whereYear('data_evento', $ano)->whereMonth('data_evento', $mes),
            ]);
    }

    public function subtitulo(): string
    {
        $this->loadMissing(['usuarios', 'cargos', 'departamentos']);

        return match ($this->tipo_escopo) {
            'global' => 'Toda a empresa',
            'departamento' => $this->departamentos->pluck('nome')->join(', ') ?: 'Setor',
            'cargo' => $this->cargos->pluck('nome')->join(', ') ?: 'Cargo',
            'individual' => $this->usuarios->pluck('name')->join(', ') ?: 'Individual',
            default => '',
        };
    }

    public function percentual(): float
    {
        if ($this->isComissao()) {
            return (float) $this->getAttribute('valor_realizado') > 0 ? 100.0 : 0.0;
        }

        return IndicadorStatus::percentual(
            (float) $this->getAttribute('valor_realizado'),
            (float) $this->getAttribute('valor_meta'),
            $this->sentido,
            ! $this->atingimentoSemTeto(),
        );
    }

    public function status(): string
    {
        if ($this->isMarco() || $this->isComissao()) {
            return $this->percentual() >= 100 ? 'concluida' : 'abaixo';
        }

        return IndicadorStatus::status($this->percentual());
    }
}
