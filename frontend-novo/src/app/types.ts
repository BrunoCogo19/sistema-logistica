// Define o formato de um objeto Cliente
export interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  endereco: string;
  bairro_cep: string;
}

// Define o formato de um objeto Pedido
export interface Pedido {
  id: string;
  clienteId: string;
  valor: number;
  quantidade_caixas: number;
  status_pagamento: 'pago' | 'na_entrega';
  tem_fardo: boolean;
  status_entrega: 'preparado' | 'saiu' | 'entregue';
  // O Firestore envia a data como um objeto Timestamp
  criado_em: string; // Ou 'any'

  // Propriedades que adicionamos no frontend
  nomeCliente?: string;
  enderecoCliente?: { rua: string; bairro: string; };
}

// Define o formato da resposta da nossa API para listas paginadas
export interface PaginatedResponse<T> {
  dados: T[];
  total: number;
}