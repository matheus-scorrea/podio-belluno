<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['variavel_id', 'ano', 'mes', 'valor', 'congelado'])]
class VariavelValor extends Model
{
    protected $table = 'variavel_valores';

    protected function casts(): array
    {
        return [
            'ano' => 'integer',
            'mes' => 'integer',
            'valor' => 'decimal:2',
            'congelado' => 'boolean',
        ];
    }

    public function variavel(): BelongsTo
    {
        return $this->belongsTo(Variavel::class);
    }
}
