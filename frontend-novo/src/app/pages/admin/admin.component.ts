import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router'; // <-- ADICIONADO para navegação
import { MatSnackBar } from '@angular/material/snack-bar';
import { Bairro, Motorista } from '../../types'; // <-- ADICIONADO Motorista
import { BairroService } from '../../services/bairro.service';
import { MotoristaService } from '../../services/motorista.service'; // <-- ADICIONADO


// Imports do Angular Material
import { CommonModule, TitleCasePipe } from '@angular/common'; // <-- ADICIONADO TitleCasePipe
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips'; // <-- ADICIONADO para o status

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TitleCasePipe, // <-- ADICIONADO
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule // <-- ADICIONADO
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {

  // --- Propriedades da Aba Bairros ---
  novoBairroNome: string = '';
  dataSourceBairros = new MatTableDataSource<Bairro>([]); // Renomeado
  displayedColumnsBairros: string[] = ['nome']; // Renomeado
  totalBairros = 0;
  pageSizeBairros = 10;
  pageIndexBairros = 0;

  // --- Propriedades da Aba Motoristas (NOVAS) ---
  motoristaDataSource = new MatTableDataSource<Motorista>([]);
  motoristaDisplayedColumns: string[] = ['nome', 'status', 'carga', 'bairros', 'acoes'];

  constructor(
    private bairroService: BairroService,
    private motoristaService: MotoristaService, // <-- ADICIONADO
    private snackBar: MatSnackBar,
    private router: Router // <-- ADICIONADO
  ) { }

  ngOnInit(): void {
    // Carrega os dados para as duas abas
    this.carregarBairros();
    this.carregarMotoristas(); // <-- ADICIONADO
  }

  // ==================================================
  // MÉTODOS DA ABA BAIRROS (Já existentes)
  // ==================================================

  carregarBairros(): void {
    this.bairroService.listarBairros(this.pageIndexBairros + 1, this.pageSizeBairros)
    .subscribe({
      next: (resposta) => {
        this.dataSourceBairros.data = resposta.dados; // Renomeado
        this.totalBairros = resposta.total;
      },
      error: (err) => {
        this.snackBar.open('Erro ao carregar lista de bairros.', 'Fechar', { duration: 3000 });
      }
    });
  }

  onPageChangeBairros(event: PageEvent): void {
    this.pageIndexBairros = event.pageIndex;
    this.pageSizeBairros = event.pageSize;
    this.carregarBairros();
  }

  onAdicionarBairro(): void {
    if (!this.novoBairroNome.trim()) return;

    this.bairroService.adicionarBairro(this.novoBairroNome).subscribe({
      next: () => {
        this.snackBar.open(`Bairro "${this.novoBairroNome}" adicionado!`, 'OK', { duration: 3000 });
        this.novoBairroNome = '';
        this.pageIndexBairros = 0; 
        this.carregarBairros();
      },
      error: (err) => {
        const msg = err.status === 409 ? 'Este bairro já está cadastrado.' : 'Erro ao adicionar bairro.';
        this.snackBar.open(msg, 'Fechar', { duration: 3000 });
      }
    });
  }
  
  // (Função onRemoverBairro foi removida como pediste)

  // ==================================================
  // MÉTODOS DA ABA MOTORISTAS (NOVOS)
  // ==================================================

  /**
   * Busca a lista de motoristas do backend.
   */
  carregarMotoristas(): void {
    this.motoristaService.listarMotoristas().subscribe({
      next: (data) => {
        this.motoristaDataSource.data = data;
      },
      error: (err) => {
        console.error('Erro ao carregar motoristas', err);
        this.snackBar.open('Erro ao carregar lista de motoristas.', 'Fechar', { duration: 3000 });
      }
    });
  }

  /**
   * Navega para o formulário de criação de motorista.
   */
  onNovoMotorista(): void {
    // Iremos criar esta rota /motoristas/novo no próximo passo
    this.router.navigate(['/motoristas/novo']);
  }

  /**
   * Navega para o formulário de edição de motorista.
   */
  onEditarMotorista(motorista: Motorista): void {
    // Iremos criar esta rota /motoristas/editar/:id no próximo passo
    this.router.navigate(['/motoristas/editar', motorista.id]);
  }

  /**
   * Remove um motorista (precisará de um diálogo de confirmação).
   */
  onRemoverMotorista(motorista: Motorista): void {
    // TODO: Adicionar um diálogo de confirmação antes de apagar
    
    this.motoristaService.removerMotorista(motorista.id).subscribe({
      next: () => {
        this.snackBar.open(`Motorista "${motorista.nome}" removido.`, 'OK', { duration: 3000 });
        this.carregarMotoristas(); // Recarrega a lista
      },
      error: (err) => {
        console.error('Erro ao remover motorista', err);
        this.snackBar.open('Erro ao remover motorista.', 'Fechar', { duration: 3000 });
      }
    });
  }
}