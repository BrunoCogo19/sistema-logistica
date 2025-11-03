import { Component, Inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { Pedido } from '../../types';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'app-etiqueta-dialog',
  standalone: true,
  imports: [
    CommonModule,
    QRCodeComponent,
    MatDialogModule,
    MatButtonModule,
    CurrencyPipe,
    DatePipe
  ],
  templateUrl: './etiqueta-dialog.component.html',
  styleUrl: './etiqueta-dialog.component.css'
})
export class EtiquetaDialogComponent {
  
  constructor(
    public dialogRef: MatDialogRef<EtiquetaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { pedido: Pedido }
  ) {}

  fechar(): void {
    this.dialogRef.close();
  }

  imprimir(): void {
    window.print();
  }
}

