import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'; // Importe MatIconModule

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule], // Adicione MatIconModule
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.css' // Corrigido para styleUrls
})
export class ConfirmationDialogComponent {
  // O construtor recebe os dados (título e mensagem)
  constructor(
    public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { title: string, message: string }
  ) {}

  onConfirm(): void {
    // Fecha o diálogo e retorna 'true' para quem o chamou
    this.dialogRef.close(true);
  }

  onDismiss(): void {
    // Fecha o diálogo e retorna 'false'
    this.dialogRef.close(false);
  }
}