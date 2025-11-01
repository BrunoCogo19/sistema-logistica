import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms'; // FormsModule e ReactiveFormsModule
import { Router, ActivatedRoute } from '@angular/router';
import { ClienteService } from '../../services/cliente.service';
import { BairroService } from '../../services/bairro.service'; // Serviço para buscar bairros
import { Cliente } from '../../types'; // Importa a interface Cliente
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators'; // Operadores RxJS
import { HttpErrorResponse } from '@angular/common/http'; // Para tipar erros

// Imports do Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule, // Necessário para FormControl
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatAutocompleteModule
  ],
  templateUrl: './cliente-form.component.html',
  styleUrl: './cliente-form.component.css'
})
export class ClienteFormComponent implements OnInit {
  // Usa Partial<Cliente> pois nem todos os campos são obrigatórios no início
  cliente: Partial<Cliente> = {
    nome: '',
    telefone: '',
    endereco: '',
    bairro: ''
  };
  isEditMode = false;

  // Lógica do Autocomplete de Bairro
  bairroControl = new FormControl(''); // FormControl para ligar ao input
  bairrosDisponiveis: string[] = []; // Lista carregada da API
  bairrosFiltrados!: Observable<string[]>; // Observable para as opções filtradas

  constructor(
    private clienteService: ClienteService,
    private bairroService: BairroService, // Injete o serviço de Bairros
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    // Carrega a lista de bairros disponíveis assim que o componente inicia
    this.carregarBairros();

    // Verifica se há um ID na rota para carregar dados para edição
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.clienteService.getClientePorId(id).subscribe(data => {
        this.cliente = data;
        // Preenche o FormControl do autocomplete com o valor carregado
        this.bairroControl.setValue(data.bairro || '');
      });
    }

    // Configura o filtro do autocomplete para reagir às mudanças no input
    this.bairrosFiltrados = this.bairroControl.valueChanges.pipe(
      startWith(''), // Começa com um valor inicial vazio
      map(value => this._filterBairros(value || '')), // Filtra a lista a cada mudança
    );
  }

  // Busca os bairros da API
  carregarBairros(): void {
    this.bairroService.listarBairros().subscribe(
      nomes => {
        this.bairrosDisponiveis = nomes;
        // Força o autocomplete a reavaliar as opções filtradas
        this.bairroControl.updateValueAndValidity({ onlySelf: true, emitEvent: true });
      },
      error => {
        console.error("Erro ao carregar bairros:", error);
        this.snackBar.open('Erro ao carregar lista de bairros.', 'Fechar', { duration: 3000 });
      }
    );
  }

  // Função interna que filtra a lista de bairros com base no valor digitado
  private _filterBairros(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.bairrosDisponiveis.filter(option => option.toLowerCase().includes(filterValue));
  }

  // Função chamada ao clicar no botão "Salvar"
  salvar(): void {
    // Garante que o valor do autocomplete está no objeto cliente antes de salvar
    this.cliente.bairro = this.bairroControl.value || '';

    let acao: Observable<any>;
    let payload: Partial<Cliente>;

    if (this.isEditMode && this.cliente.id) {
      // Prepara o payload para ATUALIZAR, removendo campos não editáveis
      payload = { ...this.cliente };
      delete payload.criado_em; // Remove, pois não deve ser enviado na atualização
      delete payload.id;      // Remove, pois o ID vai na URL

      acao = this.clienteService.atualizarCliente(this.cliente.id, payload);
    } else {
      // Prepara o payload para CRIAR
      payload = this.cliente;
      delete payload.id; // Garante que não enviamos ID na criação

      acao = this.clienteService.criarCliente(payload);
    }

    // Executa a ação (criar ou atualizar) e trata a resposta
    acao.subscribe({
      next: () => {
        const mensagem = this.isEditMode ? 'Cliente atualizado com sucesso!' : 'Cliente salvo com sucesso!';
        this.snackBar.open(mensagem, 'OK', { duration: 3000 });
        this.router.navigate(['/clientes']); // Volta para a lista de clientes
      },
      error: (err: HttpErrorResponse) => {
        const mensagemErro = this.isEditMode ? 'Erro ao atualizar cliente.' : 'Erro ao salvar cliente.';
        this.snackBar.open(mensagemErro, 'Fechar', { duration: 3000 });
        console.error('Erro detalhado:', err);
      }
    });
  }

  // Função para formatar o telefone manualmente enquanto o utilizador digita
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

    // Actualiza o modelo
    if (this.cliente) {
      this.cliente.telefone = value;
    }

    // Força a actualização visual no input (necessário devido à manipulação manual)
    setTimeout(() => {
      input.value = value;
    }, 0);
  }
}