import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router'; // Importa RouterModule
import { MatSnackBar } from '@angular/material/snack-bar';
import { MotoristaService } from '../../services/motorista.service';
import { BairroService } from '../../services/bairro.service';
import { Motorista, StatusMotorista } from '../../types';

// Imports do Angular Material
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Usaremos Forms (ngModel)
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select'; // Para os dropdowns
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // Para loading
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-motorista-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule, // Para o routerLink
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule
  ],
  templateUrl: './motorista-form.component.html',
  styleUrl: './motorista-form.component.css'
})
export class MotoristaFormComponent implements OnInit {

  // O "molde" do motorista que o formulário está a editar
  motorista: Partial<Motorista> = {
    nome: '',
    telefone: '',
    status: 'disponivel', // Valor padrão
    bairros_atendidos: []
  };
  
  // Lista de bairros para o dropdown
  listaDeBairros: string[] = [];
  
  // Lista de status para o dropdown
  listaDeStatus: StatusMotorista[] = ['disponivel', 'em_rota', 'inativo'];

  isEditMode = false;
  motoristaId: string | null = null;
  isLoading = false; // Controla o spinner de carregamento
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private motoristaService: MotoristaService,
    private bairroService: BairroService
  ) {}

  ngOnInit(): void {
    // 1. Carrega a lista de bairros para o dropdown
    this.carregarBairros();

    // 2. Verifica se é modo de Edição ou Criação
    this.motoristaId = this.route.snapshot.paramMap.get('id');
    if (this.motoristaId) {
      this.isEditMode = true;
      this.carregarDadosMotorista(this.motoristaId);
    }
  }

  carregarBairros(): void {
    this.bairroService.listarNomesDeBairros().subscribe(nomes => {
      this.listaDeBairros = nomes.sort();
    });
  }

  carregarDadosMotorista(id: string): void {
    this.isLoading = true;
    this.motoristaService.getMotoristaPorId(id).subscribe({
      next: (data) => {
        this.motorista = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.snackBar.open('Erro ao carregar dados do motorista.', 'Fechar', { duration: 3000 });
        this.router.navigate(['/admin']);
      }
    });
  }

  /**
   * Chamado ao clicar no botão Salvar.
   */
  onSubmit(): void {
    if (!this.motorista.nome || !this.motorista.status || this.motorista.bairros_atendidos?.length === 0) {
      this.snackBar.open('Nome, Status e pelo menos um Bairro são obrigatórios.', 'Fechar', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    
    // Decide qual método do serviço chamar
    const acao = this.isEditMode 
      ? this.motoristaService.atualizarMotorista(this.motoristaId!, this.motorista)
      : this.motoristaService.criarMotorista(this.motorista);

    acao.subscribe({
      next: () => {
        this.isLoading = false;
        const msg = this.isEditMode ? 'Motorista atualizado com sucesso!' : 'Motorista criado com sucesso!';
        this.snackBar.open(msg, 'OK', { duration: 3000 });
        this.router.navigate(['/admin']); // Volta para a lista
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Erro ao salvar motorista', err);
        this.snackBar.open('Erro ao salvar motorista.', 'Fechar', { duration: 3000 });
      }
    });
  }
  formatPhone(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Remove não-dígitos

    value = value.substring(0, 11); // Limita a 11 dígitos

    if (value.length <= 10) {
      // Formato (XX) XXXX-XXXX
      value = value.replace(/^(\d{2})(\d{0,4})(\d{0,4}).*/, (match, p1, p2, p3) => {
        let result = `(${p1}`;
        if (p2) result += `) ${p2}`;
        if (p3) result += `-${p3}`;
        return result;
      });
    } else {
      // Formato (XX) X XXXX-XXXX
      value = value.replace(/^(\d{2})(\d)(\d{0,4})(\d{0,4}).*/, (match, p1, p2, p3, p4) => {
        let result = `(${p1}) ${p2}`;
        if (p3) result += ` ${p3}`;
        if (p4) result += `-${p4}`;
        return result;
      });
    }

    // --- ESTA É A LINHA QUE MUDÁMOS ---
    // Actualiza o modelo do *motorista*
    if (this.motorista) {
      this.motorista.telefone = value;
    }
    // ------------------------------------

    // Força a actualização visual no input (necessário devido à manipulação manual)
    setTimeout(() => {
      input.value = value;
    }, 0);
  }
}