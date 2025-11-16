import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Pedido, PaginatedResponse } from '../types';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private apiUrl = 'http://localhost:3001/api';

  constructor(private http: HttpClient) { }

  // ... (métodos criarPedido e listarPedidos) ...

  criarPedido(pedidoData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/pedidos`, pedidoData);
  }

  listarPedidos(
    pagina: number,
    limite: number,
    status: string
  ): Observable<PaginatedResponse<Pedido>> {
    const url = `${this.apiUrl}/pedidos?pagina=${pagina}&limite=${limite}&status_entrega=${status}`;
    return this.http.get<PaginatedResponse<Pedido>>(url);
  }

  // --- NOVOS MÉTODOS ---

  /**
   * MÓDULO 3: Marca um pedido como 'saiu'
   */
  marcarComoSaiu(pedidoId: string): Observable<any> {
    // O backend espera um motoristaId. Para este fluxo manual,
    // podemos enviar um ID genérico ou 'atendente_despachou'.
    const motoristaId = 'despache_manual'; 
    return this.http.post(`${this.apiUrl}/entrega/retirada`, { pedidoId, motoristaId });
  }

  /**
   * MÓDULO 4: Marca um pedido como 'entregue'
   */
marcarComoEntregue(pedidoId: string, valor: number | null, forma: string | null): Observable<any> {
    
    // O payload para concluir
    const payload: any = {
      pedidoId: pedidoId
    };

    // Adiciona os dados de pagamento apenas se eles foram enviados
    if (valor && forma) {
      payload.valor_pago = valor;
      payload.forma_pagamento = forma;
    }
    
    // O backend (POST /api/entrega/concluir) já está pronto para isto
    return this.http.post(`${this.apiUrl}/entrega/concluir`, payload);
  }

  /**
   * (Futuro) Busca um pedido por ID para a tela de edição
   */
   getPedidoPorId(id: string): Observable<Pedido> {
    return this.http.get<Pedido>(`${this.apiUrl}/pedidos/${id}`);
  }

/**
   * MÓDULO 4: Marca um pedido como 'cancelado'
   */
  cancelarPedido(pedidoId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/pedidos/cancelar`, { pedidoId });
  }
  
  atualizarPedido(id: string, pedidoData: Partial<Pedido>): Observable<any> {
    return this.http.put(`${this.apiUrl}/pedidos/${id}`, pedidoData);
  }
}