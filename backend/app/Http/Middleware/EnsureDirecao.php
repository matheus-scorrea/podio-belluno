<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDirecao
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->is_direcao) {
            abort(403, 'Apenas a Direção pode acessar este recurso.');
        }

        return $next($request);
    }
}
