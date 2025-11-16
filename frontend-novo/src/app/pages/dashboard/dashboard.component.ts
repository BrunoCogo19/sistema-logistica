import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../../services/dashboard.service';
import { ResumoDashboard, ResumoStatusPedidos, ResumoFinanceiro } from '../../types';

// Imports dos Módulos (para standalone)
import { CommonModule, CurrencyPipe } from '@angular/common'; // <-- 1. CORRIGE O *ngIf E O |date
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,   // <-- 1. IMPORTAÇÃO ADICIONADA
    CurrencyPipe, 
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {

  isLoading = true;
  resumoStatus: ResumoStatusPedidos | null = null;
  resumoFinanceiro: ResumoFinanceiro | null = null;

  // 2. CORRIGE O ERRO 'now'. Declara a variável aqui:
  now = new Date(); 

  constructor(
    private dashboardService: DashboardService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregarResumo();
  }

  carregarResumo(): void {
    this.isLoading = true;
    this.dashboardService.getResumoGeral().subscribe({
      next: (data) => {
        this.resumoStatus = data.statusPedidos;
        this.resumoFinanceiro = data.financeiroHoje;
        this.isLoading = false;
      },
      error: (err: any) => { // (Tipo 'any' para o erro)
        this.isLoading = false;
        console.error('Erro ao carregar dashboard', err);
        const msg = err.error?.detalhe || 'Não foi possível carregar o resumo.';
        this.snackBar.open(msg, 'Fechar', { duration: 6000 });
      }
    });
  }
}