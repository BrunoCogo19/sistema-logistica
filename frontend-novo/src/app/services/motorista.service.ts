import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
// Vamos precisar de um 'Tipo' para o motorista no futuro
// import { Motorista } from '../types'; 

@Injectable({
  providedIn: 'root'
})
export class MotoristaService {
  private apiUrl = 'http://localhost:3001/api/motoristas';

  constructor(private http: HttpClient) { }

  // Deixaremos os métodos (listar, criar, editar) aqui
  // para o nosso próximo passo.
}