import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BairroService {
  private apiUrl = 'http://localhost:3001/api'; // Ajuste se necessário

  constructor(private http: HttpClient) { }

  listarBairros(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/bairros`);
  }

  // Método para adicionar (usaremos no futuro)
  adicionarBairro(nome: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/bairros`, { nome });
  }
}