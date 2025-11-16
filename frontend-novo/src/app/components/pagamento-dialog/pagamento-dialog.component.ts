import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Pedido } from '../../types'; // Importa o teu tipo Pedido

// Imports dos Módulos (para standalone)
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle'; // Para os botões de seleção
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

// Define o tipo de dado que o diálogo retorna
export interface PagamentoDialogData {
  forma: string;
  valor: number;
}

@Component({
  selector: 'app-pagamento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonToggleModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './pagamento-dialog.component.html',
  styleUrl: './pagamento-dialog.component.css'
})
export class PagamentoDialogComponent {

  // Armazena os dados que o formulário está a preencher
  dadosRetorno: PagamentoDialogData = {
    forma: '',  // ex: 'pix', 'dinheiro'
    valor: 0
  };

  // 'data' é injetado pelo componente que chamou este diálogo
  constructor(
    public dialogRef: MatDialogRef<PagamentoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public pedido: Pedido // Recebe o objeto Pedido completo
  ) {
    // Pré-preenche o valor do pedido no formulário
    if (this.pedido && this.pedido.valor) {
      this.dadosRetorno.valor = this.pedido.valor;
    }
  }

  /**
   * Chamado ao clicar em Cancelar.
   */
  onCancel(): void {
    this.dialogRef.close(); // Fecha o diálogo sem retornar nada
  }

  /**
   * Chamado ao clicar em Confirmar.
   * Fecha o diálogo e retorna os dados (forma e valor).
   */
  onConfirm(): void {
    if (!this.dadosRetorno.forma || this.dadosRetorno.valor <= 0) {
      // (Opcional: Adicionar um snackbar de erro aqui)
      return; // Não permite confirmar sem uma forma ou valor
    }
    this.dialogRef.close(this.dadosRetorno); // Retorna o objeto
  }
}