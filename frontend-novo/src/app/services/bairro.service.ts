// NO TEU FICHEIRO: src/app/services/bairro.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Bairro, PaginatedResponse } from '../types'; // Importa os tipos

@Injectable({
  providedIn: 'root'
})
export class BairroService {
  private apiUrl = 'http://localhost:3001/api/bairros';

  constructor(private http: HttpClient) { }

  /**
   * (NOVO) Método para formulários e dropdowns.
   * Busca a lista simples de nomes de bairros.
   */
  listarNomesDeBairros(): Observable<string[]> {
    // Chama a nova rota que criámos no backend
    return this.http.get<string[]>(`${this.apiUrl}/lista-nomes`);
  }

  /**
   * Método para a tabela de Admin (com paginação).
   */
  listarBairros(pagina: number, limite: number): Observable<PaginatedResponse<Bairro>> {
    const url = `${this.apiUrl}?pagina=${pagina}&limite=${limite}`;
    return this.http.get<PaginatedResponse<Bairro>>(url);
  }

  /**
   * Adiciona um novo bairro.
   */
  adicionarBairro(nome: string): Observable<any> {
    return this.http.post(this.apiUrl, { nome });
  }

  /**
   * Remove um bairro existente (por ID).
   */
  removerBairro(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}