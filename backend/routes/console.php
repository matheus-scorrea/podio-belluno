<?php

use App\Services\DwIndicadorService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('dw:sincronizar', function (DwIndicadorService $dw) {
    $resultado = $dw->sincronizarPublicadas();
    $this->info("Sincronizadas {$resultado['ok']} variáveis ({$resultado['erro']} com erro).");
})->purpose('Atualiza indicadores do data warehouse no mês vigente');

Schedule::command('dw:sincronizar')->everyFifteenMinutes();
