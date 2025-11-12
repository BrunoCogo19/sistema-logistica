import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { BairroService } from '../../services/bairro.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Bairro } from '../../types'; // Importa nosso novo tipo

// Imports do Angular Material
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule, MatTableDataSource } from '@angular/material/table'; // Para Tabela
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator'; // Para Paginador

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatTableModule,      // <-- ADICIONADO
    MatPaginatorModule,  // <-- ADICIONADO
    // MatListModule (não precisamos mais)
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {

  novoBairroNome: string = '';

  // --- Propriedades da Tabela ---
  dataSource = new MatTableDataSource<Bairro>([]);
  displayedColumns: string[] = ['nome',];
  
  // --- Propriedades da Paginação ---
  totalBairros = 0;
  pageSize = 10;
  pageIndex = 0;

  constructor(
    private bairroService: BairroService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.carregarBairros();
  }

  /**
   * Busca a lista paginada de bairros do backend e atualiza a tabela.
   */
  carregarBairros(): void {
    this.bairroService.listarBairros(this.pageIndex + 1, this.pageSize)
    .subscribe({
      next: (resposta) => {
        this.dataSource.data = resposta.dados;
        this.totalBairros = resposta.total;
      },
      error: (err) => {
        console.error('Erro ao carregar bairros', err);
        this.snackBar.open('Erro ao carregar lista de bairros.', 'Fechar', { duration: 3000 });
      }
    });
  }

  /**
   * Chamado quando o paginador muda de página.
   */
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.carregarBairros();
  }

  /**
   * Chamado quando o formulário de adicionar bairro é enviado.
   */
  onAdicionarBairro(): void {
    if (!this.novoBairroNome.trim()) return;

    this.bairroService.adicionarBairro(this.novoBairroNome).subscribe({
      next: () => {
        this.snackBar.open(`Bairro "${this.novoBairroNome}" adicionado!`, 'OK', { duration: 3000 });
        this.novoBairroNome = ''; // Limpa o campo
        // Volta para a primeira página para ver o novo item
        this.pageIndex = 0; 
        this.carregarBairros(); // Recarrega a tabela
      },
      error: (err) => {
        console.error('Erro ao adicionar bairro', err);
        const msg = err.status === 409 ? 'Este bairro já está cadastrado.' : 'Erro ao adicionar bairro.';
        this.snackBar.open(msg, 'Fechar', { duration: 3000 });
      }
    });
  }
}