<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DashboardService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function show(Request $request, DashboardService $dashboard)
    {
        $ano = (int) $request->query('ano', now()->year);
        $mes = (int) $request->query('mes', now()->month);
        $visao = (string) $request->query('visao', 'global');
        $departamentoId = $request->query('departamento_id')
            ? (int) $request->query('departamento_id')
            : null;

        return $dashboard->montar($request->user(), $ano, $mes, $visao, $departamentoId);
    }
}
