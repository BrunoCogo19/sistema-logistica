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

  criarPedido(pedidoData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/pedidos`, pedidoData);
  }


 listarPedidos(
    pagina: number,
    limite: number,
    status: string
  ): Observable<PaginatedResponse<Pedido>> {
    // Adicionamos o novo parâmetro 'status' à URL
    const url = `${this.apiUrl}/pedidos?pagina=${pagina}&limite=${limite}&status_entrega=${status}`;
    return this.http.get<PaginatedResponse<Pedido>>(url);
  }
}