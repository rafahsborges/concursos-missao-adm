export type TipoQuestao = 'multipla_escolha' | 'certo_errado';

export interface Questao {
  id: string;            // único: [SIGLA][ANO]-[PROVA]-Q[NNN]
  concurso: string;
  banca: string;
  ano: number;
  prova: string;         // rótulo da prova
  numero: number;        // numeração oficial
  disciplina: string;
  comando: string | null;
  contexto: string | null;
  tipo: TipoQuestao;
  enunciado: string;
  alternativas: Record<string, string> | null; // null p/ certo_errado
  gabarito: string | null;                     // null se anulada
  anulada: boolean;
}

export type Modulo = 'inicio' | 'trilha' | 'cronograma' | 'conteudo' | 'banco' | 'ia' | 'simulado' | 'redacao' | 'tutor' | 'desempenho';

export interface ConcursoInfo {
  nome: string; banca: string; ano: number; cargo: string;
  formato: string; regra: string; provas: string[];
  disciplinas: { nome: string; peso: string; atencao: string }[];
}

export interface RespostaSimulado { id: string; numero: number; marcada: string | null; gabarito: string | null; anulada: boolean; }

export interface SimuladoRec {
  id: string; modo: 'oficial' | 'personalizado' | 'dinamico'; concurso: string; prova: string;
  nota: number; notaMax: number; certas: number; erradas: number; brancas: number;
  tempoSeg: number; quando: number; detalhes: RespostaSimulado[];
}

export interface Progresso {
  respostas: Record<string, string>;        // só banco oficial
  respostasIA: Record<string, string>;      // só IA, chaves IA-<id>
  simulados: SimuladoRec[];                 // últimos 100
  lidos: Record<string, number>;            // capítuloId -> ts
  cronograma: Record<string, number>;       // itemId do cronograma -> ts
  metas: { diaria: number };                // meta diária de questões
  diasEstudo: Record<string, number>;       // dataISO -> ts (para streak)
  tempoQuestoes: Record<string, { seg: number; ts: number }>; // id -> tempo gasto
}

export interface Perfil { id: string; nome: string; criadoEm: number; }

export interface QuestaoIA {
  id: string; disciplina: string; estiloBanca: string; tipo: TipoQuestao;
  enunciado: string; alternativas: Record<string, string>; gabarito: string;
  criadaEm: number; fonte: 'ia';
}

export interface SecaoConteudo { titulo: string; paragrafos: string[]; }
export interface CapituloConteudo {
  id: string; titulo: string; concursos: string[];
  paginas: Record<string, number>; ordem: Record<string, number>;
  secoes: SecaoConteudo[]; complementos: { concurso: string; secoes: SecaoConteudo[] }[];
}
