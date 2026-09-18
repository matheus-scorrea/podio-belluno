<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\FechamentoService;
use Illuminate\Http\Request;

class FechamentoController extends Controller
{
    public function show(Request $request, FechamentoService $fechamento)
    {
        /** @var User $user */
        $user = $request->user();
        $ano = (int) $request->query('ano', now()->year);
        $mes = (int) $request->query('mes', now()->month);
        $departamentoId = $user->is_direcao ? $request->integer('departamento_id') : 0;

        return $fechamento->montar(
            $user,
            $ano,
            $mes,
            $departamentoId > 0 ? $departamentoId : null,
        );
    }
}
