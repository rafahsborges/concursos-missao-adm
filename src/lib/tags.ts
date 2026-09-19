import type { Questao } from '../types';

// tagging temático por palavras-chave (recurso 8)
const MAPA: Record<string, { tag: string; chaves: string[] }[]> = {
  'Língua Portuguesa': [
    { tag: 'Acentuação', chaves: ['acento', 'acentuad', 'proparox', 'parox'] },
    { tag: 'Pontuação', chaves: ['vírgula', 'virgula', 'ponto e vírgula', 'travessão', 'pontuação', 'pontuacao', 'dois-pontos', 'aspas'] },
    { tag: 'Concordância', chaves: ['concordância', 'concordancia', 'concorda o verbo', 'verbo concorda'] },
    { tag: 'Regência e crase', chaves: ['crase', 'regência', 'regencia'] },
    { tag: 'Ortografia', chaves: ['emprego de', 'uso de s', 'uso de z', 'grafia', 'ortografia', 'fonética', 'fonetica'] },
    { tag: 'Interpretação', chaves: ['texto', 'autor', 'interpret', 'ideia principal', 'tese', 'coes'] },
    { tag: 'Figuras e reescrita', chaves: ['metáfora', 'metafora', 'figura', 'reescrev', 'reescrita'] },
  ],
  'Matemática': [
    { tag: 'Regra de três', chaves: ['regra de três', 'regra de tres'] },
    { tag: 'Porcentagem', chaves: ['por cento', '%', 'percentual'] },
    { tag: 'Razão e proporção', chaves: ['razão', 'razao', 'proporcional', 'dividir em'] },
    { tag: 'Média e estatística', chaves: ['média', 'media', 'moda', 'mediana', 'estatístic'] },
    { tag: 'Combinatória', chaves: ['arranjo', 'combinação', 'combinacao', 'permuta'] },
  ],
  'Matemática Financeira': [
    { tag: 'Juros compostos', chaves: ['composto', 'capitalização composta', 'montante'] },
    { tag: 'Taxas equivalentes', chaves: ['taxa equivalente', 'taxa nominal', 'taxa efetiva', 'taxa real'] },
    { tag: 'Descontos', chaves: ['desconto'] },
    { tag: 'Amortização', chaves: ['amortização', 'amortizacao', 'SAC', 'Price', 'prestação'] },
  ],
  'Conhecimentos Bancários': [
    { tag: 'SFN e BACEN', chaves: ['sistema financeiro nacional', 'BACEN', 'Banco Central', 'CMN', 'CVM', 'SUSEP'] },
    { tag: 'Política monetária', chaves: ['Selic', 'COPOM', 'compulsório', 'redesconto', 'política monetária'] },
    { tag: 'Produtos de captação', chaves: ['CDB', 'poupança', 'LCI', 'LCA', 'debênture'] },
    { tag: 'Pix e pagamentos', chaves: ['Pix', 'pagamento instantâneo', 'transferência'] },
    { tag: 'Crédito', chaves: ['consignado', 'financiamento', 'crédito direto', 'CDC', 'empréstimo'] },
  ],
  'Conhecimentos de Informática': [
    { tag: 'Excel e planilhas', chaves: ['excel', 'planilha', 'célula', 'celula', 'fórmula', 'formula'] },
    { tag: 'Word e texto', chaves: ['word', 'documento', 'texto'] },
    { tag: 'Redes e internet', chaves: ['rede', 'protocolo', 'TCP', 'IP', 'DNS', 'navegador', 'internet'] },
    { tag: 'Segurança', chaves: ['vírus', 'virus', 'phishing', 'firewall', 'antivírus', 'antivirus', 'malware'] },
    { tag: 'Hardware e SO', chaves: ['memória', 'memoria', 'processador', 'sistema operacional', 'linux', 'windows'] },
  ],
  'Conhecimentos Específicos': [
    { tag: 'Previdenciário', chaves: ['RGPS', 'previdenciá', 'previdenciari', 'aposentadoria', 'benefício', 'beneficio', 'carência', 'carencia', 'INSS', 'auxílio', 'auxilio'] },
    { tag: 'Administrativo', chaves: ['princípio', 'principio', 'ato administrativo', 'poder de polícia', 'concurso público', 'servidor'] },
    { tag: 'Constitucional', chaves: ['CF', 'constitucional', 'art. 37', 'seguridade', 'art. 194'] },
    { tag: 'Saúde e SUS', chaves: ['SUS', 'saúde', 'saude', 'EBSERH', 'hospital'] },
  ],
  'Conhecimentos Básicos': [
    { tag: 'Português', chaves: ['acento', 'vírgula', 'interpretação de texto'] },
    { tag: 'Matemática', chaves: ['%', 'regra de três', 'média'] },
    { tag: 'Informática', chaves: ['computador', 'internet', 'software'] },
    { tag: 'Atualidades', chaves: ['atual', 'notícia'] },
  ],
  'Ética no Serviço Público Regimento Interno e Lei de Organização Judiciária': [
    { tag: 'Ética (Decreto 1.171)', chaves: ['ética', 'etica', '1.171', 'dever', 'veda'] },
    { tag: 'Regimento e Corregedoria', chaves: ['regimento', 'corregedoria', 'provimento'] },
    { tag: 'Organização judiciária', chaves: ['organização judiciária', 'competência', 'competencia', 'órgão'] },
  ],
  'Provimento Geral da Corregedoria': [
    { tag: 'Serventias e cartórios', chaves: ['serventia', 'cartório', 'cartorio', 'tabelionato', 'notas'] },
    { tag: 'Provimentos e prazos', chaves: ['provimento', 'prazo'] },
  ],
  'Provimento Judicial Aplicado ao Processo Judicial Eletrônico': [
    { tag: 'PJe e fluxos', chaves: ['PJe', 'eletrônico', 'eletronico', 'intimação', 'intimacao', 'protocolo'] },
  ],
  'Língua Inglesa': [{ tag: 'Interpretação', chaves: ['text', 'passage', 'according'] }],
  'Vendas e Negociação': [
    { tag: 'Atendimento', chaves: ['atendimento', 'cliente', 'qualidade'] },
    { tag: 'Vendas', chaves: ['venda', 'negociação', 'negociacao'] },
  ],
  'Atualidades do Mercado Financeiro': [
    { tag: 'Inflação e índices', chaves: ['IPCA', 'inflação', 'inflacao', 'índice'] },
    { tag: 'Mercado de capitais', chaves: ['bolsa', 'ações', 'acoes', 'fundo', 'renda'] },
    { tag: 'Inovação financeira', chaves: ['Pix', 'Open Finance', 'cripto', 'fintech'] },
  ],
};

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function temaDe(q: Questao): string | null {
  for (const item of MAPA[q.disciplina] ?? []) {
    const alvo = norm(q.enunciado + ' ' + (q.contexto ?? ''));
    if (item.chaves.some((c) => alvo.includes(norm(c)))) return item.tag;
  }
  return null;
}

export function temasDaDisciplina(disciplina: string): string[] {
  return (MAPA[disciplina] ?? []).map((i) => i.tag);
}
