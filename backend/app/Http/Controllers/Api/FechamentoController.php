<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FechamentoService;
use Illuminate\Http\Request;

class FechamentoController extends Controller
{
    public function show(Request $request, FechamentoService $fechamento)
    {
        $ano = (int) $request->query('ano', now()->year);
        $mes = (int) $request->query('mes', now()->month);
        $departamentoId = $request->integer('departamento_id');

        return $fechamento->montar(
            $ano,
            $mes,
            $departamentoId > 0 ? $departamentoId : null,
        );
    }
}
