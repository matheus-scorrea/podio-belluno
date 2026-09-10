# Pódio Belluno

Sistema web (Laravel API + React/MUI) para cadastro de metas mensais, lançamento de progresso pelos líderes e dashboard dinâmico por perfil.

## Stack

- Backend: Laravel 13 (PHP 8.4) + Sanctum + PostgreSQL 16
- Frontend: React 19 + Vite + MUI 9 + MUI X Charts
- Auth: cookies de sessão (SPA), autorização nas Policies

## Subir o ambiente

PHP não precisa estar instalado na máquina: o backend roda no Docker.

```bash
docker compose up -d --build
docker compose exec backend php artisan migrate --seed
cd frontend && npm install && npm run dev
```

- API: http://localhost:8000
- App: http://localhost:5173

## Contas de demonstração (senha: `password`)

- Direção: `direcao@bellunotec.com`
- Líder de TI: `joao.silva@bellunotec.com`
- Colaborador de TI: `ana.costa@bellunotec.com`
- Coordenador de CS (Sucesso do Cliente): `joao.cs@bellunotec.com`
- Executivo de CS: `everson@bellunotec.com`
- Líder Comercial e MKT: `carla.mendes@bellunotec.com`
- Líder de RH e Call Center: `fernanda.lima@bellunotec.com`

Metas de **janeiro a setembro/2026** importadas da planilha *2026 OKR Banco Bônus*. Cada indicador é um cadastro único; o alvo e o realizado ficam na competência (mês). A Direção pode **replicar o mês anterior** para abrir a competência nova sem duplicar o cadastro.

## Testes da API

```bash
docker compose exec backend php artisan test
```

## Produção (EC2)

Domínio: `https://podio.belluno.com.br`

1. DNS: registro **A** `podio` → IP público da EC2.
2. Security group: **80** e **443** abertos para o mundo; **22** só no seu IP.
3. Na EC2, clone o repositório, copie `.env.production.example` para `.env`, gere `APP_KEY` e uma senha forte de banco.
4. `docker compose -f docker-compose.prod.yml up -d --build`
5. Seed de demonstração **não** roda em produção. Crie o primeiro usuário da Direção no servidor.

Atualizar:

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec php php artisan migrate --force
```

## Perfis

- **Direção:** CRUD de usuários, departamentos (com cargos do setor) e metas (stepper de 3 etapas). Cargos e departamentos podem ser inativados sem apagar o histórico.
- **Líder:** identificado quando `cargo_id` = `departamento.cargo_lider_id`. Lança progresso do próprio setor (gaveta lateral). Vê o dashboard global, com cadeado nas metas de outros setores.
- **Colaborador:** feed apenas das metas em que se enquadra (individual, cargo, departamento ou global).
