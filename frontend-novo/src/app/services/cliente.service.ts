import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Cliente, PaginatedResponse } from '../types';

@Injectable({
  providedIn: 'root'
})
export class ClienteService {
  private apiUrl = 'http://localhost:3001/api';

  constructor(private http: HttpClient) { }

  /**
   * Busca uma lista paginada de clientes. Usado na tela de 'Gerenciar Clientes'.
   */
  listarClientesPaginado(pagina: number, limite: number): Observable<PaginatedResponse<Cliente>> {
    return this.http.get<PaginatedResponse<Cliente>>(`${this.apiUrl}/clientes?pagina=${pagina}&limite=${limite}`);
  }

  /**
   * Busca TODOS os clientes de uma vez. Usado no Dashboard de Pedidos para mostrar os nomes.
   */
  listarTodosClientes(): Observable<Cliente[]> {
    return this.http.get<PaginatedResponse<Cliente>>(`${this.apiUrl}/clientes`).pipe(
      map(resposta => resposta.dados)
    );
  }

  /**
   * Busca clientes por um termo de pesquisa. Usado no formulário de 'Novo Pedido'.
   */
  buscarClientes(termo: string): Observable<Cliente[]> {
    return this.http.get<PaginatedResponse<Cliente>>(`${this.apiUrl}/clientes?search=${termo}`).pipe(
      map(resposta => resposta.dados)
    );
  }

  /**
   * Busca um único cliente pelo seu ID. Usado no formulário de edição de cliente.
   */
  getClientePorId(id: string): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.apiUrl}/clientes/${id}`);
  }

  /**
   * Cria um novo cliente.
   */
  criarCliente(clienteData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/clientes`, clienteData);
  }

  /**
   * Atualiza um cliente existente.
   */
  atualizarCliente(id: string, clienteData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/clientes/${id}`, clienteData);
  }
}