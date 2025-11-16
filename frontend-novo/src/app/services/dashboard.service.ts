import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResumoDashboard } from '../types'; // Importa o nosso novo tipo

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  
  private apiUrl = 'http://localhost:3001/api/dashboard';

  constructor(private http: HttpClient) { }

  /**
   * Busca o resumo geral de KPIs do backend.
   */
  getResumoGeral(): Observable<ResumoDashboard> {
    return this.http.get<ResumoDashboard>(`${this.apiUrl}/resumo-geral`);
  }
}