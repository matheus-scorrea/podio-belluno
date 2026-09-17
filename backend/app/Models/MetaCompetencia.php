<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['meta_id', 'ano', 'mes', 'valor_meta', 'valor_realizado', 'niveis_comissao'])]
class MetaCompetencia extends Model
{
    protected function casts(): array
    {
        return [
            'ano' => 'integer',
            'mes' => 'integer',
            'valor_meta' => 'decimal:2',
            'valor_realizado' => 'decimal:2',
            'niveis_comissao' => 'array',
        ];
    }

    public function meta(): BelongsTo
    {
        return $this->belongsTo(Meta::class);
    }
}
