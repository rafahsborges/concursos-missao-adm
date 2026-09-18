import { useState } from 'react';
import { trpc, useAIStatus } from '../lib/trpc';

export default function Redacao() {
  const ia = useAIStatus();
  const [texto, setTexto] = useState('');
  const [correcao, setCorrecao] = useState('');
  const [aguarde, setAguarde] = useState(false);

  const pedirCorrecao = () => {
    if (texto.trim().length < 100 || aguarde) return;
    setAguarde(true);
    setCorrecao('');
    trpc.explicarSecao
      .mutate({
        titulo: 'Correção de redação dissertativo-argumentativa de concurso',
        trecho: texto.slice(0, 8000),
      })
      .then((r) => setCorrecao(r.explicacao))
      .catch(() => setCorrecao('IA indisponível no momento.'))
      .finally(() => setAguarde(false));
  };

  return (
    <div className="fade-in">
      <p className="eyebrow mb-1">Redação dissertativo-argumentativa</p>
      <h2 className="font-prova text-3xl font-semibold mb-2">Treino e correção</h2>
      <p className="selo-anulada inline-block mb-4">FERRAMENTA DE APOIO — NÃO SUBSTITUI A PROVA REAL</p>

      <section className="mb-6">
        <h3 className="font-prova text-xl font-semibold border-b border-[var(--line)] pb-2 mb-3">Estrutura cobrada</h3>
        <p className="font-prova text-[1.02rem] leading-relaxed mb-2">
          <strong>Introdução (1 parágrafo):</strong> apresente o tema, sua tese (posição clara) e, opcionalmente, um
          breve contexto ou a divisão de argumentos. Evite frase de efeito genérica — a banca quer posição, não
          enfeite.
        </p>
        <p className="font-prova text-[1.02rem] leading-relaxed mb-2">
          <strong>Desenvolvimento (2 parágrafos):</strong> um argumento por parágrafo, cada um com tópico frasal
          (ideia), explicação e exemplo ou dado. Argumente com fatos, dados e legislação — não com opinião pessoal
          ('eu acho'). Conectivos de argumentação: primeiro, além disso, por outro lado, portanto.
        </p>
        <p className="font-prova text-[1.02rem] leading-relaxed mb-2">
          <strong>Conclusão (1 parágrafo):</strong> retome a tese com outras palavras e proponha uma solução viável
          (medida concreta, não lugar-comum como 'é preciso conscientizar a sociedade'). Feche com proposta de ação
          ou impacto esperado.
        </p>
        <p className="font-prova text-[1.02rem] leading-relaxed">
          <strong>Competências avaliadas:</strong> 1) domínio da modalidade escrita formal; 2) compreensão da
          proposta e desenvolvimento do tema; 3) seleção e organização de argumentos; 4) conhecimento dos
          mecanismos linguísticos; 5) proposta de intervenção respeitando direitos humanos.
        </p>
      </section>

      <section className="mb-6">
        <h3 className="font-prova text-xl font-semibold border-b border-[var(--line)] pb-2 mb-3">Erros que derrubam nota</h3>
        <p className="font-prova text-[1.02rem] leading-relaxed mb-2">
          Fugir do tema ou contrariar a proposta; texto curto (menos de 20 linhas em geral compromete a competência
          2); parágrafo único; cópia de trechos de motivadores; marcas de conversa ('gente', 'tá'); conclusão sem
          proposta; e repertório decorado sem conexão com o argumento.
        </p>
        <p className="font-prova text-[1.02rem] leading-relaxed">
          As provas de BB (Cesgranrio), TJDFT e EBSERH (FGV) incluem redação dissertativo-argumentativa a partir de
          motivadores — o tema exato consta no caderno de cada prova, disponível nos PDFs oficiais que geraram o
          banco de questões deste sistema.
        </p>
      </section>

      <section>
        <h3 className="font-prova text-xl font-semibold border-b border-[var(--line)] pb-2 mb-3">Correção com IA</h3>
        {!ia?.disponivel && <p className="text-sm text-neutral-600 mb-3">IA indisponível — a correção está desativada.</p>}
        <textarea
          className="w-full border border-[var(--line)] p-3 font-prova text-[1rem] leading-relaxed"
          rows={12}
          placeholder="Cole aqui sua redação (mínimo ~100 caracteres)…"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
        />
        <button className="btn-ink mt-3" disabled={!ia?.disponivel || aguarde || texto.trim().length < 100} onClick={pedirCorrecao}>
          {aguarde ? 'Corrigindo…' : 'Corrigir com IA'}
        </button>
        {(aguarde || correcao) && (
          <div className="bloco-ia mt-4 p-4">
            <p className="eyebrow mb-2">Correção — gerada por IA</p>
            <p className="text-sm whitespace-pre-wrap">{aguarde ? 'Analisando…' : correcao}</p>
          </div>
        )}
      </section>
    </div>
  );
}
