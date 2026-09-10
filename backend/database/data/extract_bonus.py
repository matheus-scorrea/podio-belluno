#!/usr/bin/env python3
"""Extract Adicional (bonus) from the OKR workbook and match registered meta titles."""

from __future__ import annotations

import json
import re
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_okr_catalog import (  # noqa: E402
    ALIASES,
    DUMP,
    MESES,
    canonical_title,
    fnum,
    is_noise,
    parse_month_header,
)

OUT = Path(__file__).with_name("bonus_por_titulo.json")


def parse_adicional(raw) -> float | None:
    if raw is None:
        return None
    s = str(raw).strip()
    if s in ("", "undefined", "null", "#DIV/0!", "#VALUE!", "#REF!"):
        return None
    compact = s.replace(" ", "")
    if re.match(r"^[\d.,]+/[\d.,]+$", compact):
        return float(compact.split("/")[0].replace(",", "."))
    return fnum(s)


def adicional_cell(cells: list, ti: bool) -> float | None:
    idxs = (6, 5) if ti else (5, 6, 4)
    for idx in idxs:
        if idx >= len(cells):
            continue
        val = parse_adicional(cells[idx])
        if val is not None:
            return val
    return None


def add_obs(obs: list, mes: int | None, title_raw: str, person: str | None, bonus: float, fonte: str) -> None:
    if mes is None or bonus is None:
        return
    if not title_raw or is_noise(title_raw):
        return
    if fnum(title_raw) is not None and " " not in title_raw:
        return
    titulo, person_from_title = canonical_title(title_raw, person)
    if is_noise(titulo):
        return
    obs.append(
        {
            "mes": mes,
            "titulo": titulo,
            "person": person_from_title,
            "bonus": bonus,
            "fonte": fonte,
        }
    )


def parse_area(sheet, fonte: str, ti: bool = False) -> list[dict]:
    obs: list[dict] = []
    mes = None
    person = None
    unlabeled = 0
    header_pending = False
    for row in sheet["rows"]:
        cells = row["cells"] + [""] * 8
        a = str(cells[0]).strip()
        month, extra = parse_month_header(a)
        if month:
            mes = month
            person = extra
            header_pending = True
            unlabeled = 0 if month != 9 else unlabeled
            continue
        if a.lower() == "name":
            if ti:
                if header_pending:
                    header_pending = False
                    continue
                if mes in (9, 8, 7):
                    unlabeled += 1
                    mes = 8 if unlabeled == 1 else 7
                continue
            continue
        header_pending = False
        title = a or str(cells[1]).strip()
        bonus = adicional_cell(cells, ti=ti)
        add_obs(obs, mes, title, person, bonus, fonte)
    return obs


def resolve(obs: list[dict]) -> dict[str, float]:
    by_title: dict[str, list[dict]] = defaultdict(list)
    for row in obs:
        by_title[row["titulo"].strip()].append(row)

    resolved: dict[str, float] = {}
    conflicts: list[str] = []
    for titulo, rows in by_title.items():
        positive = [r for r in rows if r["bonus"] > 0]
        pool = positive or rows
        latest = max(r["mes"] for r in pool)
        at_latest = [r for r in pool if r["mes"] == latest]
        values = sorted({round(r["bonus"], 2) for r in at_latest})
        if len(values) > 1:
            conflicts.append(f"{titulo}: {values} (mês {latest})")
            continue
        resolved[titulo] = values[0]
    if conflicts:
        print("conflitos (não aplicados):")
        for line in conflicts:
            print(" ", line)
    return resolved


def main() -> None:
    sheets = {s["sheet"]: s for s in json.loads(DUMP.read_text())}
    obs: list[dict] = []
    obs += parse_area(sheets["Coordenador CS"], "coordenador-cs")
    obs += parse_area(sheets["Sucesso do Cliente"], "sucesso")
    obs += parse_area(sheets["RH Call Center"], "rh")
    obs += parse_area(sheets["MKT Comercial"], "mkt")
    obs += parse_area(sheets["TI e DEV"], "ti", ti=True)
    resolved = resolve(obs)
    OUT.write_text(json.dumps(resolved, ensure_ascii=False, indent=2), encoding="utf-8")
    print("titulos com adicional", len(resolved), "->", OUT)


if __name__ == "__main__":
    main()
