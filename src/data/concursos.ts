import type { ConcursoInfo } from '../types';

export const CONCURSOS: ConcursoInfo[] = [
  {
    nome: 'INSS 2022', banca: 'Cebraspe', ano: 2022, cargo: 'Técnico do Seguro Social',
    formato: '120 itens Certo/Errado (50 básicos + 70 específicos)',
    regra: '+1 por acerto, −1 por erro, 0 em branco (oficial Cebraspe)',
    provas: ['Conhecimentos Básicos (CB1)', 'Específicos + Básicos (001)'],
    disciplinas: [
      { nome: 'Língua Portuguesa', peso: 'Bloco de básicos', atencao: 'Cebraspe ancora itens em texto-base: respostas literais ao texto, não ao conhecimento geral.' },
      { nome: 'Raciocínio Lógico', peso: 'Bloco de básicos', atencao: 'Premissas verdadeiras com conclusão falsa é pegadinha clássica.' },
      { nome: 'Matemática', peso: 'Bloco de básicos', atencao: 'Regra de três e porcentagem em contexto previdenciário.' },
      { nome: 'Informática', peso: 'Bloco de básicos', atencao: 'Atalhos de MS Office e conceitos de redes e segurança.' },
      { nome: 'Direito Previdenciário', peso: 'Bloco específico (maior fatia)', atencao: 'RGPS, benefícios por incapacidade e filas do INSS; lei seca atualizada.' },
      { nome: 'Direito Administrativo', peso: 'Bloco específico', atencao: 'Princípios, atos administrativos e organização administrativa.' },
      { nome: 'Direito Constitucional', peso: 'Bloco específico', atencao: 'Seguridade social: princípios e o art. 194 aparecem em toda prova.' },
    ],
  },
  {
    nome: 'Banco do Brasil 2023', banca: 'Cesgranrio', ano: 2023, cargo: 'Escriturário – Agente Comercial',
    formato: '70 questões A–E + Redação',
    regra: '1 ponto por acerto, sem penalidade (oficial Cesgranrio)',
    provas: ['Prova A', 'Prova B', 'Prova C'],
    disciplinas: [
      { nome: 'Língua Portuguesa', peso: 'Questões 1–10', atencao: 'Cesgranrio cobra reescrita de frases: gramática aplicada ao contexto.' },
      { nome: 'Língua Inglesa', peso: 'Questões 11–15', atencao: 'Interpretação de texto; vocabulário financeiro ajuda.' },
      { nome: 'Matemática', peso: 'Questões 16–20', atencao: 'Regra de três, porcentagem e razão/proporção.' },
      { nome: 'Atualidades do Mercado Financeiro', peso: 'Questões 21–25', atencao: 'Sistema Financeiro Nacional, BACEN e produtos bancários.' },
      { nome: 'Matemática Financeira', peso: 'Questões 26–30', atencao: 'Juros simples e compostos, descontos e amortização.' },
      { nome: 'Conhecimentos Bancários', peso: 'Questões 31–40', atencao: 'Normas do BACEN, estratégia do BB e canal digital.' },
      { nome: 'Conhecimentos de Informática', peso: 'Questões 41–55', atencao: 'Maior bloco da prova: atalhos, redes e ferramentas digitais do BB.' },
      { nome: 'Vendas e Negociação', peso: 'Questões 56–70', atencao: 'Atendimento, qualidade no serviço e perfil do agente comercial.' },
    ],
  },
  {
    nome: 'TJDFT 2022', banca: 'FGV', ano: 2022, cargo: 'Técnico Judiciário – Área Administrativa',
    formato: '60 questões A–E + Redação (4 tipos)',
    regra: '1 ponto por acerto, sem penalidade',
    provas: ['Tipo 1', 'Tipo 2', 'Tipo 3', 'Tipo 4'],
    disciplinas: [
      { nome: 'Língua Portuguesa', peso: 'Bloco inicial', atencao: 'FGV cobra pontuação e reescrita com rigor; revise vírgula e concordância.' },
      { nome: 'Ética no Serviço Público Regimento Interno e Lei de Organização Judiciária', peso: 'Bloco específico', atencao: 'Lei 8.112/90, Código de Ética da PRF e competências dos órgãos do TJDFT.' },
      { nome: 'Provimento Geral da Corregedoria', peso: 'Bloco específico', atencao: 'Provimentos da Corregedoria do DF: prazos e procedimentos internos.' },
      { nome: 'Provimento Judicial Aplicado ao Processo Judicial Eletrônico', peso: 'Bloco específico', atencao: 'PJe: fluxos, prazos e atuação das serventias no eletrônico.' },
    ],
  },
  {
    nome: 'EBSERH 2024/2025', banca: 'FGV', ano: 2025, cargo: 'Assistente Administrativo',
    formato: '60 questões A–E + Redação (4 tipos)',
    regra: '1 ponto por acerto, sem penalidade; anuladas não pontuam',
    provas: ['Tipo 1', 'Tipo 2', 'Tipo 3', 'Tipo 4'],
    disciplinas: [
      { nome: 'Conhecimentos Básicos', peso: 'Questões 1–30', atencao: 'Língua Portuguesa, Matemática/Raciocínio Lógico, Informática e Atualidades (saúde pública).' },
      { nome: 'Conhecimentos Específicos', peso: 'Questões 31–60', atencao: 'Administração Geral e Pública, Direito Administrativo (Lei 8.112 e Lei 14.133) e Administração da Saúde/SUS.' },
    ],
  },
];
