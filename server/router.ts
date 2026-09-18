import { initTRPC } from '@trpc/server';
import { z } from 'zod';
import * as ai from './ai';
import { getDados, salvar, tutorMemoria } from './aiStore';

const t = initTRPC.create();
const PROF = 'Você é um professor de concursos públicos brasileiros. Responda em PT-BR, sem emojis, de forma didática. O gabarito oficial é definitivo: explique, nunca conteste.';

const questaoIA = z.object({
  disciplina: z.string().min(2),
  estiloBanca: z.string().min(1),
  tipo: z.enum(['multipla_escolha', 'certo_errado']),
  enunciado: z.string().min(20),
  alternativas: z.record(z.string(), z.string()).nullable(),
  gabarito: z.string().min(1).max(5),
});

export const appRouter = t.router({
  status: t.procedure.query(async () => ({
    disponivel: await ai.disponivel(),
    mock: process.env.AI_MOCK === '1',
  })),

  dicaQuestao: t.procedure
    .input(z.object({ id: z.string(), enunciado: z.string(), disciplina: z.string() }))
    .mutation(async ({ input }) => {
      const d = getDados();
      if (d.dicas[input.id]) return { dica: d.dicas[input.id] };
      const texto = await ai.chat(
        PROF,
        'Dê uma DICA (não revele a resposta) para a questão de ' + input.disciplina + ':\n' + input.enunciado.slice(0, 2500));
      d.dicas[input.id] = texto;
      salvar();
      return { dica: texto };
    }),

  explicarQuestao: t.procedure
    .input(z.object({
      id: z.string(), enunciado: z.string(), gabarito: z.string().nullable(),
      anulada: z.boolean(), disciplina: z.string(),
    }))
    .mutation(async ({ input }) => {
      const d = getDados();
      if (d.explicacoes[input.id]) return { explicacao: d.explicacoes[input.id] };
      const gab = input.anulada ? 'item ANULADO pela banca' : 'gabarito oficial: ' + input.gabarito;
      const texto = await ai.chat(
        PROF,
        'Explique o gabarito (' + gab + ') da questão de ' + input.disciplina + '. O gabarito é definitivo.\n' + input.enunciado.slice(0, 3000));
      d.explicacoes[input.id] = texto;
      salvar();
      return { explicacao: texto };
    }),

  explicarSecao: t.procedure
    .input(z.object({ titulo: z.string(), trecho: z.string().max(8000) }))
    .mutation(async ({ input }) => ({
      explicacao: await ai.chat(
        PROF,
        'Explique a seção "' + input.titulo + '" a seguir (não reescreva o texto, apenas explique):\n' + input.trecho),
    })),

  tutor: t.procedure
    .input(z.object({ mensagem: z.string().min(1).max(4000), contexto: z.string().max(2000) }))
    .mutation(async ({ input }) => {
      const historico = tutorMemoria.slice(-10).map((m) => m.papel + ': ' + m.texto).join('\n');
      const resp = await ai.chat(
        PROF,
        'Contexto do projeto do aluno:\n' + input.contexto + '\n\nConversa recente:\n' + historico + '\n\nAluno: ' + input.mensagem);
      const agora = Date.now();
      tutorMemoria.push({ quando: agora, papel: 'user', texto: input.mensagem });
      tutorMemoria.push({ quando: agora, papel: 'assistant', texto: resp });
      if (tutorMemoria.length > 40) tutorMemoria.splice(0, tutorMemoria.length - 40);
      return { resposta: resp };
    }),

  gerarQuestoes: t.procedure
    .input(z.object({
      disciplina: z.string().min(2),
      estiloBanca: z.string().min(1),
      quantidade: z.number().int().min(1).max(20),
    }))
    .mutation(async ({ input }) => {
      const prompt = 'Gere ' + input.quantidade + ' questões inéditas de ' + input.disciplina +
        ' no estilo da banca ' + input.estiloBanca +
        ', em JSON puro: array de objetos {tipo:"multipla_escolha",enunciado,alternativas:{"A":"...","B":"...","C":"...","D":"...","E":"..."},gabarito:"A".."E"}. Sem emojis.';
      const bruto = await ai.chat(PROF, prompt);
      const m = bruto.match(/\[[\s\S]*\]/);
      let validas = 0;
      if (m) {
        try {
          const arr = JSON.parse(m[0]) as unknown[];
          const d = getDados();
          for (const item of arr) {
            const p = questaoIA.safeParse({ ...(item as object), disciplina: input.disciplina, estiloBanca: input.estiloBanca });
            if (!p.success) continue; // descarte de inválidas
            if (p.data.tipo === 'multipla_escolha' &&
                (!p.data.alternativas || !(p.data.gabarito in p.data.alternativas))) continue;
            const id = 'IA-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
            d.questoes[id] = { ...p.data, id, criadaEm: Date.now(), fonte: 'ia' };
            salvar();
            validas++;
          }
        } catch { /* JSON inválido: nada é persistido */ }
      }
      return { geradas: validas };
    }),

  listarQuestoesIA: t.procedure.query(() => Object.values(getDados().questoes)),

  limparQuestoesIA: t.procedure.mutation(() => {
    getDados().questoes = {};
    salvar();
    return { ok: true };
  }),

  statsIA: t.procedure.query(() => {
    const d = getDados();
    return {
      geradas: Object.keys(d.questoes).length,
      dicas: Object.keys(d.dicas).length,
      explicacoes: Object.keys(d.explicacoes).length,
    };
  }),
});

export type AppRouter = typeof appRouter;
