<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CargoController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartamentoController;
use App\Http\Controllers\Api\DwConexaoController;
use App\Http\Controllers\Api\FechamentoController;
use App\Http\Controllers\Api\LancamentoController;
use App\Http\Controllers\Api\MetaController;
use App\Http\Controllers\Api\ResultadosController;
use App\Http\Controllers\Api\UsuarioController;
use App\Http\Controllers\Api\VariavelController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware(['auth:sanctum', 'usuario.ativo'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/me/senha', [AuthController::class, 'atualizarSenha']);

    Route::middleware('senha.definida')->group(function () {
        Route::get('/dashboard', [DashboardController::class, 'show']);

        Route::get('/departamentos', [DepartamentoController::class, 'index']);
        Route::get('/cargos', [CargoController::class, 'index']);

        Route::get('/metas/lancaveis', [LancamentoController::class, 'lancaveis']);
        Route::get('/metas', [MetaController::class, 'index']);
        Route::get('/metas/{meta}', [MetaController::class, 'show']);
        Route::get('/metas/{meta}/lancamentos', [LancamentoController::class, 'index']);
        Route::post('/metas/{meta}/lancamentos', [LancamentoController::class, 'store']);
        Route::get('/fechamento', [FechamentoController::class, 'show']);
        Route::get('/me/resultados', [ResultadosController::class, 'show']);

        Route::middleware('direcao')->group(function () {
            Route::apiResource('departamentos', DepartamentoController::class)->except(['index']);
            Route::apiResource('cargos', CargoController::class)->except(['index']);
            Route::apiResource('usuarios', UsuarioController::class);
            Route::post('/usuarios/{usuario}/senha-temporaria', [UsuarioController::class, 'senhaTemporaria']);
            Route::post('/metas/abrir-competencia', [MetaController::class, 'abrirCompetencia']);
            Route::post('/metas/{meta}/clonar', [MetaController::class, 'clonar']);
            Route::post('/metas', [MetaController::class, 'store']);
            Route::put('/metas/{meta}', [MetaController::class, 'update']);
            Route::delete('/metas/{meta}', [MetaController::class, 'destroy']);

            Route::get('/conexoes', [DwConexaoController::class, 'index']);
            Route::post('/conexoes', [DwConexaoController::class, 'store']);
            Route::post('/conexoes/testar', [DwConexaoController::class, 'testarRascunho']);
            Route::get('/conexoes/{conexao}', [DwConexaoController::class, 'show']);
            Route::put('/conexoes/{conexao}', [DwConexaoController::class, 'update']);
            Route::delete('/conexoes/{conexao}', [DwConexaoController::class, 'destroy']);
            Route::post('/conexoes/{conexao}/testar', [DwConexaoController::class, 'testar']);

            Route::get('/variaveis', [VariavelController::class, 'index']);
            Route::post('/variaveis', [VariavelController::class, 'store']);
            Route::post('/variaveis/testar', [VariavelController::class, 'testarConsulta']);
            Route::post('/variaveis/sincronizar', [VariavelController::class, 'sincronizar']);
            Route::get('/variaveis/{variavel}', [VariavelController::class, 'show']);
            Route::put('/variaveis/{variavel}', [VariavelController::class, 'update']);
            Route::delete('/variaveis/{variavel}', [VariavelController::class, 'destroy']);
            Route::post('/variaveis/{variavel}/testar', [VariavelController::class, 'testar']);
            Route::post('/variaveis/{variavel}/publicar', [VariavelController::class, 'publicar']);
            Route::post('/variaveis/{variavel}/inativar', [VariavelController::class, 'inativar']);
            Route::post('/variaveis/{variavel}/reativar', [VariavelController::class, 'reativar']);
        });
    });
});
