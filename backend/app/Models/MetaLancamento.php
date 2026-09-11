<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'meta_id',
    'data_evento',
    'valor_realizado',
    'valor_adesao',
    'observacao',
    'departamento_id',
    'cargo_id',
    'usuario_alvo_id',
    'lancado_por',
])]
class MetaLancamento extends Model
{
    protected function casts(): array
    {
        return [
            'data_evento' => 'date',
            'valor_realizado' => 'decimal:2',
            'valor_adesao' => 'decimal:2',
        ];
    }

    public function meta(): BelongsTo
    {
        return $this->belongsTo(Meta::class);
    }

    public function departamento(): BelongsTo
    {
        return $this->belongsTo(Departamento::class);
    }

    public function cargo(): BelongsTo
    {
        return $this->belongsTo(Cargo::class);
    }

    public function usuarioAlvo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_alvo_id');
    }

    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'lancado_por');
    }
}
