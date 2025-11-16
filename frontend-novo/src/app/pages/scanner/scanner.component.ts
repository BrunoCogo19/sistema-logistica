import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PedidoService } from '../../services/pedido.service'; 
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http'; // Importa o HttpErrorResponse

@Component({
  selector: 'app-scanner',
  standalone: true,
  imports: [
    CommonModule,
    ZXingScannerModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './scanner.component.html',
  styleUrl: './scanner.component.css'
})
export class ScannerComponent {
  
  isLoading = false;
  scannerEnabled = true;
  allowedFormats = [ BarcodeFormat.QR_CODE ];

  constructor(
    private pedidoService: PedidoService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  /**
   * Função pública para o botão 'Voltar'.
   */
  voltar(): void {
    this.router.navigate(['/pedidos']);
  }

  /**
   * Chamado quando o scanner lê um QR code com sucesso.
   * (VERSÃO ATUALIZADA PARA LER VÁRIAS CAIXAS)
   */
  onScanSuccess(pedidoId: string): void {
    // 1. Trava para evitar scans duplicados enquanto processa
    if (this.isLoading) {
      return;
    }
    
    // 2. Desliga a câmera e mostra o loading
    this.scannerEnabled = false;
    this.isLoading = true;

    console.log('QR Code lido:', pedidoId);

    // 3. Chama a função "marcarComoSaiu"
    this.pedidoService.marcarComoSaiu(pedidoId).subscribe({
      next: (resposta) => {
        // SUCESSO!
        this.isLoading = false;
        this.snackBar.open(`Pedido ${pedidoId.substring(0, 6)}... saiu para entrega!`, 'OK', { 
          duration: 3000
        });
        
        // --- ESTA É A MUDANÇA ---
        // REMOVEMOS: this.voltar();
        
        // ADICIONAMOS: Re-abilita o scanner após 1.5 segundos
        // para dar tempo de mover a câmera para a próxima caixa.
        setTimeout(() => {
          this.scannerEnabled = true;
        }, 1500); // 1.5 segundos de "cooldown"
      },
      error: (err: HttpErrorResponse) => { // Tipado como HttpErrorResponse
        // ERRO!
        this.isLoading = false;
        console.error('Erro ao dar saída:', err);
        
        const msg = err.error?.message || 'Erro ao processar o QR Code.';
        this.snackBar.open(msg, 'Fechar', { duration: 5000 });
        
        // Liga a câmera novamente para tentar de novo
        // (Não precisamos de timeout aqui, o erro é instantâneo)
        this.scannerEnabled = true;
      }
    });
  }

  onScanError(error: Error): void {
    console.error('Erro no scanner:', error);
    this.snackBar.open('Erro ao iniciar a câmera. Verifique as permissões.', 'Fechar', { duration: 5000 });
  }
}