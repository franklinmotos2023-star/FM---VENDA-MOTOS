export type PlanoFinanceiro = {
  parcelas: number;
  taxaTotal: number; // Porcentagem total de juros (ex: 10.29 para 10.29%)
};

export type Moto = {
  id: string;
  placa: string;
  marcaModelo: string;
  anoFabricacao: number;
  anoModelo: number;
  quilometragem: string;
  precoAVista: number;
  precoAntigo?: number;
  statusRevisao: string;
  statusDut: string;
  fotos: string[];
  cambio?: string;
  combustivel?: string;
  descricao?: string;
  equipamentos?: string[];
  planos?: PlanoFinanceiro[];
};

export type SaleData = {
  motoId: string;
  valorBase: number;
  entrada: number;
  taxaJuros: number;
  parcelas: number;
  taxasExtras: number;
  valorFinal: number;
  valorParcela: number;
  totalJuros: number;
  valorFinanciado: number;
};

export type BuyerData = {
  nome: string;
  cpf: string;
  rg?: string;
  endereco?: string;
  cep?: string;
  telefone: string;
  dataVenda: string;
};

export type PaymentMethod = {
  id: string;
  tipo: 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'financiamento' | 'promissoria' | 'outro';
  valor: number;
  parcelas?: number;
  detalhes?: string;
};

export type SaleRecord = {
  id?: string;
  motoId: string;
  motoMarcaModelo: string;
  motoPlaca: string;
  compradorNome: string;
  compradorCpf: string;
  telefone: string;
  email?: string;
  cep?: string;
  
  // Valores da simulação original
  valorVenda: number;
  entrada: number;
  parcelas: number;
  valorParcela: number;
  
  // Valores finais da venda (preenchidos no fechamento)
  valorVendaFinal?: number;
  descontoAplicado?: number;
  pagamentos?: PaymentMethod[];
  pagamentoAVista?: boolean;
  
  // Dados de financiamento bancário
  financiamentoBancario?: {
    banco?: string;
    valorFinanciado?: number;
    anexoProposta?: string;
    questionario?: {
      tempoCompra: string;
      sistemaSimulacao: string;
      precos: string;
    };
  };
  
  // Diferenciais acordados na venda
  diferenciais?: {
    dutIncluso: boolean;
    garantia3Meses: boolean;
    tanqueCheio: boolean;
    capacete: boolean;
    revisao: boolean;
  };
  
  observacoes?: string;
  fotosRecibo?: string[]; // URLs das fotos anexadas
  
  dataVenda: string;
  dataFinalizacao?: string;
  vendedorUid: string;
  status: 'pendente' | 'concluida' | 'cancelada';
};

export type UserProfile = {
  uid: string;
  email: string;
  role: 'admin' | 'user';
};

export type PurchaseInstallment = {
  numero: number;
  valor: number;
  dataVencimento: string;
  status: 'pendente' | 'pago';
};

export type PurchaseRecord = {
  id?: string;
  motoInfo: {
    marcaModelo: string;
    placa: string;
    anoFabricacao: number;
    anoModelo: number;
    quilometragem: string;
    cor: string;
    chassi?: string;
    renavam?: string;
  };
  vendedorNome: string;
  vendedorCpfCnpj: string;
  vendedorTelefone: string;
  vendedorEndereco?: string;
  
  valorTotal: number;
  entrada: number;
  valorFinanciado: number;
  parcelas: PurchaseInstallment[];
  
  dataCompra: string;
  fotos: string[];
  observacoes?: string;
  status: 'em_estoque' | 'vendida' | 'cancelada';
  isPublished?: boolean;
};

export type Acessorio = {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  precoPromocional?: number;
  emPromocao: boolean;
  fotos: string[];
  aplicacao: string; // Motos compatíveis
  marcaMoto?: string;
  modeloMoto?: string;
  estoque: number;
  isArchived?: boolean;
  categoria?: string;
  tags?: string[];
};

export type AcessoriosConfig = {
  marcas: string[];
  motos: string[];
};

export type CartItem = {
  acessorio: Acessorio;
  quantidade: number;
};

export type AcessorioSaleRecord = {
  id?: string;
  items: {
    acessorioId: string;
    nome: string;
    preco: number;
    quantidade: number;
  }[];
  valorTotal: number;
  compradorNome: string;
  compradorCpf: string;
  telefone: string;
  cep?: string;
  endereco?: string;
  dataVenda: string;
  status: 'pendente' | 'concluida' | 'cancelada';
};

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
