// termos-chave por disciplina para negrito automático (recurso 1)
const GLOSSARIO: Record<string, string[]> = {
  'Conhecimentos Específicos': [
    'RGPS', 'Lei 8.213/91', 'Decreto 3.048/99', 'carência', 'DIB', 'DER',
    'auxílio por incapacidade', 'aposentadoria por idade', 'pedágio',
    'princípios da Administração Pública', 'ato administrativo', 'poder de polícia',
    'seguridade social', 'art. 194', 'SUS', 'EBSERH', 'BPC/LOAS', 'salário de benefício',
  ],
  'Língua Portuguesa': [
    'crase', 'regência', 'concordância', 'acentuação', 'oxítona', 'paroxítona',
    'proparoxítona', 'metáfora', 'metonímia', 'hipérbato', 'silepse', 'zeugma',
    'anacoluto', 'polissíndeto', 'assíndeto', 'anáfora', 'catáfora', 'elipse',
  ],
  'Matemática': ['regra de três', 'porcentagem', 'razão', 'proporção', 'MMC', 'MDC', 'média aritmética', 'mediana', 'moda', 'arranjo', 'combinação', 'permutação'],
  'Matemática Financeira': ['juros compostos', 'juros simples', 'taxa efetiva', 'taxa nominal', 'taxa equivalente', 'desconto racional', 'desconto comercial', 'SAC', 'Tabela Price', 'amortização', 'montante', 'capital'],
  'Conhecimentos Bancários': ['SFN', 'CMN', 'BACEN', 'CVM', 'SUSEP', 'Selic', 'COPOM', 'compulsório', 'CDB', 'poupança', 'LCI', 'LCA', 'debênture', 'Pix', 'consignado', 'CET', 'FGC', 'open finance'],
  'Conhecimentos de Informática': ['hardware', 'software', 'memória RAM', 'memória ROM', 'sistema operacional', 'Linux', 'Windows', 'rede LAN', 'rede WAN', 'protocolo', 'TCP/IP', 'DNS', 'DHCP', 'firewall', 'antivírus', 'phishing', 'ransomware', 'backup', 'Excel', 'planilha', 'célula'],
  'Conhecimentos Básicos': ['seguridade social', 'SUS', 'interpretação de texto', 'porcentagem', 'regra de três', 'art. 194'],
  'Atualidades do Mercado Financeiro': ['IPCA', 'IGP-M', 'inflação', 'regime de metas', 'Ibovespa', 'B3', 'renda fixa', 'renda variável', 'Tesouro Direto', 'Pix', 'open finance', 'criptoativo', 'Lei 14.478'],
  'Vendas e Negociação': ['atendimento', 'qualidade no atendimento', 'escuta ativa', 'cross-selling', 'up-selling', 'CET', 'perfil do cliente', 'rapport', 'etiqueta no atendimento'],
  'Língua Inglesa': ['main idea', 'according to the text', 'inference', 'vocabulary', 'phrasal verb'],
  'Ética no Serviço Público Regimento Interno e Lei de Organização Judiciária': ['Decreto 1.171/94', 'Código de Ética', 'probidade', 'impessoalidade', 'Regimento Interno', 'Corregedoria', 'Tribunal Pleno', 'Conselho Especial', 'competência'],
  'Provimento Geral da Corregedoria': ['provimento', 'Corregedoria', 'serventia', 'cartório', 'emolumentos', 'custas', 'inspeção'],
  'Provimento Judicial Aplicado ao Processo Judicial Eletrônico': ['PJe', 'processo eletrônico', 'intimação eletrônica', 'certificado digital', 'ICP-Brasil', 'dia útil eletrônico', 'protocolo eletrônico', 'petição inicial'],
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function termosDe(disciplina: string): string[] {
  return GLOSSARIO[disciplina] ?? [];
}

// negrito automático + destaques do usuário (escapado, seguro para innerHTML)
export function renderRich(paragrafo: string, disciplina: string, destaques: string[]): string {
  let h = esc(paragrafo);
  for (const d of destaques) {
    const de = esc(d);
    if (de.length >= 3) h = h.split(de).join('<mark class="hl-user">' + de + '</mark>');
  }
  for (const t of termosDe(disciplina)) {
    const re = new RegExp('\\b(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')\\b', 'gi');
    h = h.replace(re, '<strong>$1</strong>');
  }
  return h;
}
