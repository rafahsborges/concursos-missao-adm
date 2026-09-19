#!/usr/bin/env python3
"""Extrai questões reais dos PDFs oficiais para src/data/banco.json.

Auditoria (prompt, seção 8):
- respeita diagramação em 2 colunas (coluna esquerda -> direita);
- âncoras = numeração oficial (regras por banca; número pode estar colado no texto);
- gabaritos: tabelas em runs (linha de números seguida de linha de letras),
  região antes/depois do marcador conforme o PDF (Cebraspe: antes; FGV: depois);
- validação final: contagens, ids únicos, anuladas sem gabarito.

Uso: python3 scripts/extrair_banco.py [pasta_dos_pdfs]
"""
import fitz, re, json, sys, unicodedata, collections
from pathlib import Path

UP = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/mnt/agents/upload")
RAIZ = Path(__file__).resolve().parent.parent
OUT = RAIZ / "src" / "data" / "banco.json"
REL = Path(__file__).resolve().parent / "validacao_relatorio.txt"


def t(pdf):
    d = fitz.open(str(pdf)); r = "".join(pg.get_text() for pg in d); d.close(); return r


def norm(s):
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()


def eh_header(ls):
    return (re.fullmatch(r"[A-ZÀ-Ú0-9 ,./()\-–]{5,}", ls) is not None
            and norm(ls).isupper() and not re.fullmatch(r"\d+", ls))


def limpar_header(h):
    h = re.sub(r"\s+", " ", h.strip(" -–·")).strip().lower()
    menores = {"de", "da", "do", "das", "dos", "e", "em", "a", "o", "as", "os", "no", "na", "nos", "nas", "ao", "aos", "à", "às", "com", "por"}
    palavras = [p if p in menores else p[:1].upper() + p[1:] for p in h.split(" ")]
    return " ".join(palavras)


def fluxo(pdf, min_size=8.5):
    """Linhas em ordem de leitura (2 colunas: esquerda -> direita).
    Retorna (texto, negrito, x, tamanho, inicia_com_numero)."""
    out = []
    d = fitz.open(str(pdf))
    for pg in d:
        W = pg.rect.width
        grupos = {}
        for b in pg.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                spans = [s for s in l["spans"] if s["size"] >= min_size and s["text"].strip()]
                if not spans:
                    continue
                y = round(sum(s["bbox"][1] for s in spans) / len(spans))
                spans.sort(key=lambda s: s["bbox"][0])
                x = spans[0]["bbox"][0]
                sz = spans[0]["size"]
                bold = any((s["flags"] & 16) or "Bold" in s["font"] for s in spans)
                texto = "".join(s["text"] for s in spans)
                col = 0 if x < W / 2 else 1
                grupos.setdefault((col, y), []).append((x, texto, bold, sz, spans[0]["text"].strip()))
        for (col, y), parts in sorted(grupos.items(), key=lambda kv: (kv[0][0], kv[0][1])):
            parts.sort()
            texto = re.sub(r"\s+", " ", " ".join(p[1] for p in parts).replace("\xad", "")).strip()
            ini_num = bool(re.fullmatch(r"\d{1,3}", parts[0][4]))
            out.append((texto, any(p[2] for p in parts), parts[0][0], parts[0][3], ini_num, y))
    d.close()
    BOILER_LINHAS = {
        'CEBRASPE – INSS – Edital: 2022', 'CADERNO DE PROVAS OBJETIVAS',
        'CARGO: TÉCNICO DO SEGURO SOCIAL', 'Aplicação: 27/11/2022',
        'TÉCNICO DO SEGURO SOCIAL', 'TARDE', 'Espaço livre', 'Espaço reservado',
    }
    return [l for l in out if l[0] and not re.fullmatch(r"[ _]+", l[0]) and l[0] not in BOILER_LINHAS]


# regras de âncora por banca (numeração oficial)
REGRA_CEBRASPE = lambda txt, b, x, s, ini, y: ini and 8.5 <= s <= 9.6 and (x < 45 or 295 < x < 325)
REGRA_FGV = lambda txt, b, x, s, ini, y: ini and b and 8.5 <= s <= 9.6
REGRA_CESGRANRIO = lambda txt, b, x, s, ini, y: ini and b and 9.4 <= s <= 12 and not (288 <= x <= 300)


def achar_anchors(linhas, regra, n0, n1):
    """Subsequência n0..n1 de números oficiais (pode estar colado: '10No início...')."""
    cand = [i for i, (txt, b, x, s, ini, y) in enumerate(linhas) if ini and regra(txt, b, x, s, ini, y)]
    anchors, pos = {}, -1
    for n in range(n0, n1 + 1):
        achou = next((i for i in cand if i > pos and linhas[i][0].startswith(str(n))), None)
        if achou is None:
            break
        anchors[n] = achou
        pos = achou
    return anchors


def gabarito_bloco(full, marcador, ate=None, padrao_cesgranrio=False):
    """{num: letra} para o bloco do cargo correto (letras A-E; X/* = anulada)."""
    i = full.find(marcador)
    assert i >= 0, f"marcador não achado: {marcador}"
    fim = full.find(ate, i + len(marcador)) if ate else len(full)
    if fim < i:
        fim = len(full)
    depois = full[i:fim]
    antes = full[:i]

    def pares(bloco):
        bloco = re.sub(r"Página \d+ de \d+", " ", bloco)
        res = {}
        if padrao_cesgranrio:
            for m in re.finditer(r"(\d{1,3})\s*-\s*([A-E])", bloco):
                n = int(m.group(1))
                if 1 <= n <= 200:
                    res[n] = m.group(2)
        else:
            toks = re.findall(r"(?<![\d/])([1-9]\d{0,2}|\*|X|(?<![A-Za-z])[A-E])(?![A-Za-z\d/])", bloco)
            runs = []
            for tk in toks:
                kind = "N" if tk.isdigit() else "L"
                if runs and runs[-1][0] == kind:
                    runs[-1][1].append(tk)
                else:
                    runs.append([kind, [tk]])
            for j in range(len(runs) - 1):
                if runs[j][0] == "N" and runs[j + 1][0] == "L":
                    nums = [int(v) for v in runs[j][1]]
                    lets = runs[j + 1][1]
                    sub = [[nums[0]]]
                    for v in nums[1:]:
                        if v == sub[-1][-1] + 1:
                            sub[-1].append(v)
                        else:
                            sub.append([v])
                    for n, l in zip(sub[-1], lets):
                        res[n] = "X" if l == "*" else l
        return res

    ra, rd = pares(antes), pares(depois)
    return rd if len(rd) >= len(ra) else ra


BOILER = ("CADERNO DE PROVAS", "CONCURSO PÚBLICO")


def parse(linhas, anchors, gabs, prefixo, concurso, prova, ano, banca,
          tipo, fix_disc=None, com_textos=False, parar=("REDAÇÃO", "FIM DA PROVA")):
    questoes, header, puladas = [], "GERAL", []
    ctx_marcadores = {i: txt for i, (txt, b, x, s, ini, y) in enumerate(linhas) if com_textos and txt.startswith("Texto ")}
    ctx_atual = None
    ns = sorted(anchors)
    # header vigente antes da primeira questão (ex.: "CONHECIMENTOS BÁSICOS")
    if ns:
        for i in range(anchors[ns[0]]):
            txt, b = linhas[i][0], linhas[i][1]
            if b and eh_header(txt) and not any(p in txt for p in BOILER):
                header = limpar_header(txt)
    for k, n in enumerate(ns):
        ini = anchors[n]
        fim = anchors[ns[k + 1]] if k + 1 < len(ns) else len(linhas)
        for mi, mt in ctx_marcadores.items():
            if ini < mi < fim:
                ctx_atual = mt
        # padrão Cebraspe: a 1ª linha do item fica ACIMA do número e a 1ª linha do item
        # SEGUINTE fica ABAIXO do último texto do item (âncora = número, y ~1px deslocado)
        ini_corpo = ini
        fim_corpo = fim
        if tipo == "certo_errado":
            if ini > 0:
                prev = linhas[ini - 1]
                if (not prev[4]) and (abs(prev[5] - linhas[ini][5]) <= 4) and not prev[0].startswith("Texto "):
                    ini_corpo = ini - 1
            if fim < len(linhas):
                ult = linhas[fim - 1]
                if (not ult[4]) and (abs(ult[5] - linhas[fim][5]) <= 4) and not ult[0].startswith("Texto "):
                    fim_corpo = fim - 1
        corpo = []
        for i in range(ini_corpo, fim_corpo):
            txt = linhas[i][0]
            if i == ini:
                txt = re.sub(r"^\d{1,3}\s*", "", txt).strip()  # restante da linha-âncora
                if not txt:
                    continue
            corpo.append((txt, linhas[i][1]))
        corpo = [(txt, b) for txt, b in corpo if not (com_textos and txt.startswith("Texto "))]
        if tipo == "certo_errado":
            corpo = [(txt, b) for txt, b in corpo if not re.fullmatch(r"\d{1,3}(\s+\d{1,3})*", txt)]
            corpo = [(txt, b) for txt, b in corpo if not re.match(r"(?i)^\s*julgue os itens", txt)]
        corte = next((i for i, (txt, b) in enumerate(corpo)
                      if b and eh_header(txt) and any(p in txt for p in parar)), None)
        if corte is not None:
            corpo = corpo[:corte]
        # segmenta: headers, alternativas (várias podem estar na mesma linha) e enunciado
        segs = []
        for txt, b in corpo:
            if b and eh_header(txt) and not any(p in txt for p in BOILER):
                segs.append(("H", limpar_header(txt)))
                continue
            if tipo == "multipla_escolha":
                parts = re.split(r"\(([A-E])\)", txt)
                if len(parts) == 1:
                    segs.append((None, txt))
                else:
                    if parts[0].strip():
                        segs.append((None, parts[0].strip()))
                    for k2 in range(1, len(parts), 2):
                        segs.append((parts[k2], parts[k2 + 1].strip()))
            else:
                segs.append((None, txt))
        # mescla headers consecutivos (título quebrado em duas linhas)
        segs2 = []
        for letra, texto in segs:
            if letra == "H" and segs2 and segs2[-1][0] == "H":
                segs2[-1] = ("H", segs2[-1][1] + " " + texto)
            else:
                segs2.append((letra, texto))
        COMANDO_RE = re.compile(r"(?i)\s*julgue os itens[^.]*")
        comando_partes = []
        segs3 = []
        for letra, texto in segs2:
            m = COMANDO_RE.search(texto)
            if m:
                comando_partes.append(m.group(0).strip())
                texto = COMANDO_RE.sub("", texto).strip()
            if texto or letra:
                segs3.append((letra, texto))
        comando = " ".join(comando_partes) or None
        enun, alts, cur = [], {}, None
        for letra, texto in segs3:
            if letra == "H":
                header = texto
                cur = None
                continue
            if letra:
                cur = letra
                alts.setdefault(cur, "")
                if texto:
                    alts[cur] = (alts[cur] + " " + texto).strip()
            elif cur:
                alts[cur] += " " + texto
            else:
                enun.append(texto)
        if tipo == "certo_errado" and len(" ".join(enun)) < 15:
            puladas.append(n)
            continue
        if tipo == "multipla_escolha" and len(alts) < 2:
            puladas.append(n)
            continue
        if tipo == "certo_errado":
            enun_str = " ".join(enun).strip()
            mm = re.search(r"(?i)\s*julgue os[^.]{0,40}itens[^.]*\.?", enun_str)
            if mm:
                if not comando:
                    comando = mm.group(0).strip()
                enun_str = re.sub(r"\s+", " ", (enun_str[: mm.start()] + " " + enun_str[mm.end():]).strip())
        else:
            enun_str = " ".join(enun).strip()
        g = gabs.get(n)
        questoes.append({
            "id": f"{prefixo}-Q{n:03d}", "concurso": concurso, "banca": banca, "ano": ano,
            "prova": prova, "numero": n, "disciplina": fix_disc(n) if fix_disc else header,
            "comando": comando, "contexto": ctx_atual if com_textos else None, "tipo": tipo,
            "enunciado": enun_str, "alternativas": alts or None,
            "gabarito": None if g in ("X", "*", None) else g, "anulada": g in ("X", "*"),
        })
    return questoes, puladas


# ================= INSS (Cebraspe) =================
gab_cb1 = gabarito_bloco(t(UP / "GAB_DEFINITIVO_760_INSS_CB1_01.pdf"), "760_INSS_CB1_01")
gab_001 = gabarito_bloco(t(UP / "GAB_DEFINITIVO_760_INSS_001_01.pdf"), "760_INSS_001_01")
lin_cb1 = fluxo(UP / "760_INSS_CB1_01.pdf")
lin_001 = fluxo(UP / "760_INSS_001_01.pdf")
an_cb1 = achar_anchors(lin_cb1, REGRA_CEBRASPE, 1, 50)
an_001 = achar_anchors(lin_001, REGRA_CEBRASPE, 51, 120)
q_cb1, p_cb1 = parse(lin_cb1, an_cb1, gab_cb1, "INSS2022-CB1", "INSS 2022", "Conhecimentos Básicos (CB1)", 2022, "Cebraspe", "certo_errado", fix_disc=lambda n: "Conhecimentos Básicos", com_textos=True)
q_001, p_001 = parse(lin_001, an_001, gab_001, "INSS2022-001", "INSS 2022", "Específicos + Básicos (001)", 2022, "Cebraspe", "certo_errado", fix_disc=lambda n: "Conhecimentos Específicos")

# ================= Banco do Brasil (CESGRANRIO) =================
BB_DISC = [(1, 10, "Língua Portuguesa"), (11, 15, "Língua Inglesa"), (16, 20, "Matemática"),
           (21, 25, "Atualidades do Mercado Financeiro"), (26, 30, "Matemática Financeira"),
           (31, 40, "Conhecimentos Bancários"), (41, 55, "Conhecimentos de Informática"),
           (56, 70, "Vendas e Negociação")]


def bb_disc(n):
    return next(d for a, b, d in BB_DISC if a <= n <= b)


q_bb, p_bb = [], []
for letra in "ABC":
    g = gabarito_bloco(t(UP / f"GABARITO - 23-04-2023 - PROVA {letra} - ESCRITURÁRIO - AGENTE COMERCIAL.pdf"),
                       "GABARITO 1", ate="GABARITO 2", padrao_cesgranrio=True)
    lin = fluxo(UP / f"PROVA {letra} - AGENTE COMERCIAL - GABARITO 1.pdf")
    qs, ps = parse(lin, achar_anchors(lin, REGRA_CESGRANRIO, 1, 70), g, f"BB2023-{letra}", "Banco do Brasil 2023",
                   f"Prova {letra}", 2023, "Cesgranrio", "multipla_escolha", fix_disc=bb_disc)
    q_bb += qs
    p_bb += [f"{letra}:{n}" for n in ps]

# ================= TJDFT (FGV) =================
gab_tj = t(UP / "tjdft2022_gabarito_definitivo.pdf")
q_tj, p_tj = [], []
for tp in range(1, 5):
    g = gabarito_bloco(gab_tj, f"Técnico Judiciário - Área Administrativa – Tipo {tp}",
                       ate=f"Técnico Judiciário - Área Administrativa – Tipo {tp+1}" if tp < 4 else "Analista Judiciário")
    lin = fluxo(UP / f"tecnico_judiciario_-_area_administrativanm-aa_tipo_{tp}.pdf")
    qs, ps = parse(lin, achar_anchors(lin, REGRA_FGV, 1, 60), g, f"TJDFT2022-T{tp}", "TJDFT 2022", f"Tipo {tp}", 2022, "FGV", "multipla_escolha")
    q_tj += qs
    p_tj += [f"T{tp}:{n}" for n in ps]

# ================= EBSERH (FGV) =================
gab_eb = t(UP / "ebserhadministrativo2024_gabarito_definitivo_v2_0.pdf")
q_eb, p_eb = [], []
for tp in range(1, 5):
    g = gabarito_bloco(gab_eb, f"Grupo - Assistente Administrativo - TIPO  {tp}",
                       ate=f"Grupo - Assistente Administrativo - TIPO  {tp+1}" if tp < 4 else None)
    lin = fluxo(UP / f"grupo-12-assistente-administrativoe4cnmgp12-tipo-{tp}.pdf")
    qs, ps = parse(lin, achar_anchors(lin, REGRA_FGV, 1, 60), g, f"EBSERH2025-T{tp}", "EBSERH 2024/2025", f"Tipo {tp}", 2025, "FGV", "multipla_escolha")
    q_eb += qs
    p_eb += [f"T{tp}:{n}" for n in ps]

# ================= validação =================
banco = q_cb1 + q_001 + q_bb + q_tj + q_eb
ids = [q["id"] for q in banco]
dup = [i for i, c in collections.Counter(ids).items() if c > 1]
for q in banco:
    assert (not q["anulada"]) or (q["gabarito"] is None), f"invariante anulada: {q['id']}"

esperado = {"INSS2022-CB1": (50, 1, 50), "INSS2022-001": (70, 51, 120),
            "BB2023-A": (70, 1, 70), "BB2023-B": (70, 1, 70), "BB2023-C": (70, 1, 70),
            "TJDFT2022-T1": (60, 1, 60), "TJDFT2022-T2": (60, 1, 60),
            "TJDFT2022-T3": (60, 1, 60), "TJDFT2022-T4": (60, 1, 60),
            "EBSERH2025-T1": (60, 1, 60), "EBSERH2025-T2": (60, 1, 60),
            "EBSERH2025-T3": (60, 1, 60), "EBSERH2025-T4": (60, 1, 60)}
cont, sem_gab, geral = {}, {}, {}
for q in banco:
    p = q["id"].rsplit("-Q", 1)[0]
    cont[p] = cont.get(p, 0) + 1
    geral[p] = geral.get(p, 0) + (1 if q["disciplina"] == "GERAL" else 0)
    if q["gabarito"] is None and not q["anulada"]:
        sem_gab[p] = sem_gab.get(p, 0) + 1

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(banco, ensure_ascii=False, indent=1))

linhas = [f"TOTAL: {len(banco)} questões | ids duplicados: {dup if dup else 'nenhum'}"]
for k, (v, n0, n1) in esperado.items():
    st = "OK" if cont.get(k, 0) == v else "FALHA"
    extra = ""
    if sem_gab.get(k):
        extra += f" | SEM gabarito: {sem_gab[k]}"
    if geral.get(k):
        extra += f" | disciplina GERAL: {geral[k]}"
    linhas.append(f"{k}: extraídas={cont.get(k, 0)} esperado={v} [{st}]{extra}")
if p_bb or p_tj or p_eb:
    linhas.append(f"puladas BB:{p_bb} TJDFT:{p_tj} EBSERH:{p_eb}")
discs = sorted({q["disciplina"] for q in banco})
linhas.append(f"DISCIPLINAS ({len(discs)}): " + "; ".join(discs))
linhas.append("Amostragem manual obrigatória: fronteiras de disciplina e 2 questões por prova.")
REL.write_text("\n".join(linhas))
print("\n".join(linhas))
