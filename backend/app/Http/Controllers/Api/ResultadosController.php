<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ResultadosService;
use Illuminate\Http\Request;

class ResultadosController extends Controller
{
    public function show(Request $request, ResultadosService $resultados)
    {
        /** @var User $user */
        $user = $request->user();
        $ano = (int) $request->query('ano', now()->year);

        return $resultados->montar($user, $ano);
    }
}
