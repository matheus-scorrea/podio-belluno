<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CargoController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DepartamentoController;
use App\Http\Controllers\Api\FechamentoController;
use App\Http\Controllers\Api\LancamentoController;
use App\Http\Controllers\Api\MetaController;
use App\Http\Controllers\Api\ResultadosController;
use App\Http\Controllers\Api\UsuarioController;
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
            Route::post('/metas', [MetaController::class, 'store']);
            Route::put('/metas/{meta}', [MetaController::class, 'update']);
            Route::delete('/metas/{meta}', [MetaController::class, 'destroy']);
        });
    });
});
