import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
// Assegura-te que 'Motorista' está importado do teu ficheiro de tipos
import { Motorista } from '../types'; 

@Injectable({
  providedIn: 'root'
})
export class MotoristaService {
  private apiUrl = 'http://localhost:3001/api/motoristas';

  constructor(private http: HttpClient) { }

  /**
   * (NOVO) Lista todos os motoristas.
   */
  listarMotoristas(): Observable<Motorista[]> {
    return this.http.get<Motorista[]>(this.apiUrl);
  }

  /**
   * (NOVO) Busca os dados de um motorista específico pelo ID.
   */
  getMotoristaPorId(id: string): Observable<Motorista> {
    return this.http.get<Motorista>(`${this.apiUrl}/${id}`);
  }

  /**
   * (NOVO) Cria um novo motorista.
   */
  criarMotorista(motoristaData: Partial<Motorista>): Observable<any> {
    return this.http.post(this.apiUrl, motoristaData);
  }

  /**
   * (NOVO) Atualiza os dados de um motorista existente.
   */
  atualizarMotorista(id: string, motoristaData: Partial<Motorista>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, motoristaData);
  }

  /**
   * (NOVO - O que corrige o erro) Remove um motorista pelo ID.
   */
  removerMotorista(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}