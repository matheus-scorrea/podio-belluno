#!/usr/bin/env python3
"""Build okr_2026.json from the parsed 2026 OKR Banco Bonus workbook dump."""

from __future__ import annotations

import json
import re
from calendar import monthrange
from pathlib import Path

DUMP = Path("/tmp/okr_xlsx_dump.json")
OUT = Path(__file__).with_name("okr_2026.json")

MESES = {
    "Janeiro": 1,
    "Fevereiro": 2,
    "Março": 3,
    "Abril": 4,
    "Maio": 5,
    "Junho": 6,
    "Julho": 7,
    "Agosto": 8,
    "Setembro": 9,
    "Outubro": 10,
    "Novembro": 11,
    "Dezembro": 12,
}

SKIP_TITLES = {
    "name",
    "subitems",
    "subelementos",
    "2026 okr banco",
    "2026 okr - coordenador cs",
    "2026 okr - rh e call center",
    "2026 okr - comercial e mkt",
    "2026 okr - ti",
    "2026 okr - sucesso do cliente",
}

ALIASES = {
    "atendimentos faturados": "Atendimentos faturados mês",
    "total de erros": "Total de erros/reclamações",
    "turnover": "Turnover de Desligamento",
    "leads do rh": "Leads do RH (CVs novos recebidos no mês)",
    "leads do rh (cvs novos recebidos no mês)": "Leads do RH (CVs novos recebidos no mês)",
    "churn r$ menor": "Churn de receitas em R$",
    "churn r$": "Churn de receitas em R$",
    "valor em upgrade ou upsell": "Valor em Upgrade ou Upsell",
    "valor em upgrade ou upcell": "Valor em Upgrade ou Upsell",
    "venda novos contratos": "Valor de venda novos contratos",
    "valor em adesão": "Valor em adesões no mês",
    "nota média do pós venda": "Nota média do Pós Vendas",
    "nota média do pós vendas": "Nota média do Pós Vendas",
    "sla soluções mesas ativações e suporte": "SLA Solução mesas de Suporte e Ativação",
    "sla solução mesas de suporte e ativação": "SLA Solução mesas de Suporte e Ativação",
    "média prazo de ativações 15 dias ou menos": "Prazo médio em dias das ativações",
    "prazo médio em dias das ativações": "Prazo médio em dias das ativações",
    "tme": "TME segundos",
    "tme segundos": "TME segundos",
    "reuniões de evolução (top 10)": "Reuniões de Evolução (coordenação)",
    "reuniões evolução realizadas": "Reuniões de Evolução (coordenação)",
    "contatos de relacionamento": "Contatos de Relacionamento (coordenação)",
    "contatos de relacionamento realizados": "Contatos de Relacionamento (coordenação)",
    "show musical na confra": "Show na confra",
    "implantar ianalista para usuários": "Implantar IAnalista",
    "criar visualização de dados retroativos na dashboard": "Concluir dados retroativos na dashboard",
}

PERSON_RE = re.compile(
    r"(Larissa|Everson|Bruno|Aline|Murilo|João)",
    re.IGNORECASE,
)


def fnum(x):
    if x is None:
        return None
    s = str(x).strip()
    if s in ("", "undefined", "null", "#DIV/0!", "#VALUE!", "#REF!"):
        return None
    if s.lower() in ("não atingido",):
        return None
    if s.lower() in ("sim", "yes"):
        return 100.0
    if s.lower() in ("não", "nao", "no"):
        return 0.0
    try:
        return float(s.replace(",", "."))
    except ValueError:
        return None


def parse_month_header(text: str) -> tuple[int | None, str | None]:
    raw = str(text).strip()
    for name, num in MESES.items():
        if raw == name:
            return num, None
        if raw.startswith(name):
            extra = raw[len(name) :].strip(" -–")
            person = None
            found = PERSON_RE.search(extra)
            if found:
                person = found.group(1)
            return num, person
    # "Agosto Bruno" already handled. Also "2026 Bruno" is not a month.
    return None, None


def canonical_title(name: str, person: str | None) -> tuple[str, str | None]:
    original = re.sub(r"\s+", " ", name).strip()
    found = PERSON_RE.search(original)
    person_from_title = found.group(1).title() if found else None
    person = person_from_title or (person.title() if person else None)
    if person == "João":
        person = "João CS"
    if person and person not in {
        "Larissa",
        "Everson",
        "Bruno",
        "Aline",
        "Murilo",
        "João CS",
    }:
        person = None

    key = original.lower()
    key = re.sub(r"\s+", " ", key)
    if "reuniões de relacionamento" in key or "reuniões de evolução" in key or key.startswith("reuniões de evolução"):
        if person:
            return f"Reuniões de Evolução — {person}", person
    if "contatos de relacionamento" in key:
        if person:
            return f"Contatos de Relacionamento — {person}", person
        if "%" in original or "evolução + telefone" in key:
            return original, person
    if "saldo carteira" in key and person:
        return f"Saldo Carteira — {person}", person

    stripped = PERSON_RE.sub("", original)
    stripped = re.sub(r"\s*[—\-]\s*$", "", stripped)
    stripped = re.sub(r"\s+", " ", stripped).strip()
    stripped = re.sub(r"\s+\)", ")", stripped)
    stripped = re.sub(r"\(\s+", "(", stripped)
    alias_key = stripped.lower()
    titulo = ALIASES.get(alias_key, stripped if stripped else original)
    titulo = ALIASES.get(titulo.lower(), titulo)
    return titulo, None


def classify(titulo: str, person: str | None) -> dict:
    t = titulo.lower()
    if person:
        dept = "Coordenação CS" if person == "João CS" else "Sucesso do Cliente"
        email = {
            "Larissa": "larissa@bellunotec.com",
            "Everson": "everson@bellunotec.com",
            "Bruno": "bruno@bellunotec.com",
            "Aline": "aline@bellunotec.com",
            "Murilo": "murilo@bellunotec.com",
            "João CS": "joao.cs@bellunotec.com",
        }[person]
        return {
            "tipo_escopo": "individual",
            "departamento": dept,
            "usuario_email": email,
        }

    if any(k in t for k in ("saldo crescimento", "faturamento", "churn de receitas %")):
        return {"tipo_escopo": "global", "departamento": None, "usuario_email": None}
    if any(k in t for k in ("atendimento", "erro", "turnover", "tme", "nma", "monitoria", "leads do rh", "reclamaç")):
        if "chat 40%" in t or "tiflux" in t:
            return {"tipo_escopo": "departamento", "departamento": "TI e DEV", "usuario_email": None}
        if t == "nma" or t.startswith("tme") or "atendimentos faturados" in t or "turnover" in t or "erros" in t or "monitoria" in t or "reclamaç" in t or "leads do rh" in t:
            return {"tipo_escopo": "departamento", "departamento": "RH e Call Center", "usuario_email": None}
    if any(
        k in t
        for k in (
            "leads provedor",
            "venda novos",
            "valor de venda",
            "vendas totais",
            "ades",
            "artigos",
            "cnpj",
            "contratos novos",
            "indicações",
            "programa de indicações",
        )
    ):
        return {"tipo_escopo": "departamento", "departamento": "Comercial e MKT", "usuario_email": None}
    if any(
        k in t
        for k in (
            "upgrade",
            "churn de receitas em r",
            "receptivos",
            "reuniões de evolução (coordenação)",
            "contatos de relacionamento (coordenação)",
        )
    ):
        return {"tipo_escopo": "departamento", "departamento": "Coordenação CS", "usuario_email": None}
    if any(
        k in t
        for k in (
            "saldo sucesso",
            "prazo médio",
            "pós venda",
            "mesas de suporte",
        )
    ):
        return {"tipo_escopo": "departamento", "departamento": "Sucesso do Cliente", "usuario_email": None}
    if any(
        k in t
        for k in (
            "ti e dev",
            "ianalista",
            "mockup",
            "whatsapp",
            "dashboard",
            "webphone",
            "callback",
            "call back",
            "teif",
            "simples",
            "disponibilidade",
            "belluno.com",
            "monday",
            "bônus",
            "bonus",
            "relatório",
            "show na confra",
            "bugs",
            "chat 1.0",
            "ativar",
            "implantar",
            "otimizar",
            "criar app",
            "concluir dados",
        )
    ):
        return {"tipo_escopo": "departamento", "departamento": "TI e DEV", "usuario_email": None}

    return {"tipo_escopo": "global", "departamento": None, "usuario_email": None}


def unidade_sentido(titulo: str, tipo_hint: str | None) -> tuple[str, str, str]:
    t = titulo.lower()
    menor = bool(tipo_hint and "menor" in tipo_hint.lower()) or any(
        k in t for k in ("churn", "erro", "turnover", "tme", "prazo médio", "reclamaç")
    )
    sentido = "menor_melhor" if menor else "maior_melhor"
    if any(
        k in t
        for k in (
            "r$",
            "saldo",
            "faturamento",
            "venda",
            "ades",
            "upgrade",
            "churn de receitas em",
            "carteira",
            "receptivos",
            "crescimento",
        )
    ):
        unidade = "R$"
        chart = "progress_bar"
    elif any(k in t for k in ("%", "sla", "turnover")) or "churn de receitas %" in t:
        unidade = "%"
        chart = "gauge"
    else:
        unidade = "un"
        chart = "gauge" if any(k in t for k in ("nma", "nota")) else "progress_bar"
    if "projetos" in t or "implantar" in t or "criar" in t or "ativar" in t or "concluir" in t or "mockup" in t:
        unidade = "%"
        chart = "progress_bar"
    return unidade, sentido, chart


def color_for(departamento: str | None) -> str:
    return {
        None: "#00A8E8",
        "Coordenação CS": "#0077B6",
        "Sucesso do Cliente": "#0077B6",
        "RH e Call Center": "#10B981",
        "Comercial e MKT": "#F59E0B",
        "TI e DEV": "#0A1128",
    }.get(departamento, "#00A8E8")


def is_noise(title: str) -> bool:
    t = title.strip().lower()
    if not t or t in SKIP_TITLES:
        return True
    if t.startswith("2026"):
        return True
    if t in {"undefined", "null"}:
        return True
    return False


def upsert(catalog: dict, rec: dict) -> None:
    if rec["valor_meta"] is None:
        return
    if isinstance(rec["valor_meta"], float) and rec["valor_meta"] < 0:
        rec["valor_meta"] = abs(rec["valor_meta"])
    key = (rec["mes"], rec["titulo"].lower(), rec.get("usuario_email") or rec.get("departamento") or "global")
    prev = catalog.get(key)
    if not prev:
        catalog[key] = rec
        return
    if prev.get("realizado") is None and rec.get("realizado") is not None:
        catalog[key] = rec
        return
    if rec.get("realizado") is not None and prev.get("realizado") is not None:
        # keep the one from banco (source=banco) over department copies
        if rec.get("fonte") == "banco" and prev.get("fonte") != "banco":
            catalog[key] = rec


def add_row(catalog, mes, titulo_raw, meta, realizado, tipo, person, fonte):
    if mes is None or not titulo_raw:
        return
    if is_noise(titulo_raw):
        return
    if fnum(titulo_raw) is not None and " " not in titulo_raw:
        return
    titulo, person = canonical_title(titulo_raw, person)
    if is_noise(titulo):
        return
    valor_meta = fnum(meta)
    valor_real = fnum(realizado)
    if valor_meta is None:
        return
    if float(valor_meta) in (266.0, 56250.0):
        return
    scope = classify(titulo, person)
    unidade, sentido, chart = unidade_sentido(titulo, tipo)
    rec = {
        "titulo": titulo[:180],
        "descricao": f"Importado do OKR Banco Bônus 2026 ({fonte}).",
        "ano": 2026,
        "mes": mes,
        "valor_meta": round(float(valor_meta), 2),
        "unidade": unidade,
        "sentido": sentido,
        "chart_tipo": chart,
        "chart_cor": color_for(scope["departamento"]),
        "realizado": None if valor_real is None else round(float(valor_real), 2),
        "fonte": fonte,
        **scope,
    }
    upsert(catalog, rec)


def fill_forward_targets(catalog: dict) -> None:
    stable = {
        "saldo crescimento",
        "atendimentos faturados mês",
        "total de erros/reclamações",
        "turnover de desligamento",
        "leads do rh (cvs novos recebidos no mês)",
        "leads provedor gerados",
        "valor de venda novos contratos",
        "valor em adesões no mês",
        "quantidades de contratos novos",
        "quantidade de reuniões realizadas (cnpj)",
        "artigos publicados no blog",
        "churn de receitas em r$",
        "churn de receitas %",
        "valor em upgrade ou upsell",
        "contatos de relacionamento (coordenação)",
        "reuniões de evolução (coordenação)",
        "tme segundos",
        "nma",
        "prazo médio em dias das ativações",
        "sla solução mesas de suporte e ativação",
        "nota média do pós vendas",
        "valor de faturamento",
        "valor de vendas totais",
        "valor em contratos de receptivos ao final do mês",
        "sla atendimento tiflux",
        "sla solução tiflux",
        "avaliação (nma) chat 40% tiflux",
    }
    by_title: dict[tuple, list] = {}
    for rec in catalog.values():
        k = (rec["titulo"].lower(), rec.get("usuario_email"), rec.get("departamento"))
        by_title.setdefault(k, []).append(rec)
    extras = []
    seen = {(r["mes"], r["titulo"].lower(), r.get("usuario_email"), r.get("departamento")) for r in catalog.values()}
    for key, rows in by_title.items():
        if key[0] not in stable:
            continue
        rows.sort(key=lambda r: r["mes"])
        latest = rows[-1]
        if latest["mes"] != 8:
            continue
        clone = dict(latest)
        clone["mes"] = 9
        clone["realizado"] = None
        clone["fonte"] = "carry-aug"
        ident = (9, clone["titulo"].lower(), clone.get("usuario_email"), clone.get("departamento"))
        if ident not in seen:
            extras.append(clone)
            seen.add(ident)
    for rec in extras:
        upsert(catalog, rec)


def parse_banco(sheet, catalog):
    mes = None
    for row in sheet["rows"]:
        cells = (row["cells"] + [""] * 5)[:5]
        a, b, c, d, e = cells
        month, _ = parse_month_header(a)
        if month and not str(b).strip():
            mes = month
            continue
        add_row(catalog, mes, a, b, c, e, None, "banco")


def parse_named_blocks(sheet, catalog, fonte, default_person=None):
    mes = None
    person = default_person
    for row in sheet["rows"]:
        cells = row["cells"] + [""] * 7
        a = str(cells[0]).strip()
        month, extra = parse_month_header(a)
        if month:
            mes = month
            person = extra or default_person
            continue
        # TI layout sometimes has title in col0, meta in col2
        if fnum(cells[1]) is not None:
            meta, realizado = cells[1], cells[2]
        elif cells[1] and fnum(cells[1]) is None and len(str(cells[1])) > 3:
            meta, realizado = cells[2], cells[3]
        else:
            # value in col C without a target in col B is realizado, not meta
            meta, realizado = None, cells[2]
        add_row(catalog, mes, a or str(cells[1]).strip(), meta, realizado, None, person, fonte)


def parse_ti(sheet, catalog):
    """First Name after a month label is the header. Later unlabeled Name rows are prior months."""
    unlabeled_blocks = 0
    mes = None
    header_pending = False
    for row in sheet["rows"]:
        cells = row["cells"] + [""] * 7
        a = str(cells[0]).strip()
        month, extra = parse_month_header(a)
        if month:
            mes = month
            header_pending = True
            unlabeled_blocks = 0 if month != 9 else unlabeled_blocks
            continue
        if a.lower() == "name":
            if header_pending:
                header_pending = False
                continue
            if mes in (9, 8, 7):
                unlabeled_blocks += 1
                mes = 8 if unlabeled_blocks == 1 else 7
            continue
        header_pending = False
        title = a or str(cells[1]).strip()
        if str(cells[1]).strip() and fnum(cells[1]) is None and len(str(cells[1])) > 2 and not a:
            title = str(cells[1]).strip()
            meta = cells[2]
            realizado = cells[3]
        elif fnum(cells[1]) is None and cells[2] and fnum(cells[2]) is not None:
            meta = cells[2]
            realizado = cells[3]
        else:
            meta = cells[1]
            realizado = cells[2]
            if fnum(meta) is None:
                meta = cells[2]
                realizado = cells[3]
        if fnum(meta) in (266.0, 56250.0, 562.5):
            continue
        if fnum(meta) is None and title.lower() in {
            "relatório e notificação de call back",
            "concluir dados retroativos na dashboard",
        }:
            meta = 100.0
        add_row(catalog, mes, title, meta, realizado, None, None, "ti")


def main():
    sheets = {s["sheet"]: s for s in json.loads(DUMP.read_text())}
    catalog: dict = {}
    parse_banco(sheets["2026 okr banco"], catalog)
    parse_named_blocks(sheets["Coordenador CS"], catalog, "coordenador-cs")
    parse_named_blocks(sheets["Sucesso do Cliente"], catalog, "sucesso")
    parse_named_blocks(sheets["RH Call Center"], catalog, "rh")
    parse_named_blocks(sheets["MKT Comercial"], catalog, "mkt")
    parse_ti(sheets["TI e DEV"], catalog)
    fill_forward_targets(catalog)

    metas = list(catalog.values())
    metas.sort(key=lambda r: (r["mes"], r.get("departamento") or "", r["titulo"]))
    ordem = {}
    for rec in metas:
        k = rec["mes"]
        ordem[k] = ordem.get(k, 0) + 1
        rec["ordem_exibicao"] = ordem[k]
        rec.pop("fonte", None)

    payload = {"ano": 2026, "origem": "2026_OKR_Banco_Bonus.xlsx", "metas": metas}
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    by_mes = {}
    for m in metas:
        by_mes[m["mes"]] = by_mes.get(m["mes"], 0) + 1
    print("wrote", OUT, "metas", len(metas), "por mês", by_mes)


if __name__ == "__main__":
    main()
