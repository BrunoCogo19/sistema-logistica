// Define o formato de um objeto Cliente
export interface Cliente {
  id?: string; // ID é opcional (só existe depois de salvar)
  nome: string;
  telefone?: string;
  endereco: string;
  bairro: string; // Bairro é obrigatório no cliente
  criado_em?: any;
}

// Define o formato de um objeto Pedido
export interface Pedido {
  id?: string; // ID é opcional (só existe depois de salvar)
  clienteId: string;
  valor: number;
  quantidade_caixas: number;
  status_pagamento: 'pago' | 'na_entrega';
  tem_fardo: boolean;
  status_entrega: 'preparado' | 'saiu' | 'entregue' | 'cancelado';
  criado_em: string; // O backend envia como string ISO
  
  // ADICIONADO: O Bairro é guardado como uma "cópia" no pedido
  bairro?: string; 

  // Propriedades que adicionamos no frontend para exibição
  nomeCliente?: string;
  enderecoCliente?: { rua: string; bairro: string; };
}

// Define o formato da resposta da nossa API para listas paginadas
export interface PaginatedResponse<T> {
  dados: T[];
  total: number;
}
export interface Bairro {
  id: string; // O ID do documento (ex: 'centro')
  nome: string; // O nome formatado (ex: 'Centro')
}