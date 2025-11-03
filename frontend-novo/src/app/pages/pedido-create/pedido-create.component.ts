import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { ClienteService } from '../../services/cliente.service';
import { PedidoService } from '../../services/pedido.service';
import { BairroService } from '../../services/bairro.service';
import { Cliente, Pedido } from '../../types';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

// Imports do Material
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; 

// Importe o seu componente de diálogo
import { EtiquetaDialogComponent } from '../../components/etiqueta-dialog/etiqueta-dialog.component';

@Component({
  selector: 'app-pedido-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule, // Para FormControl
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSnackBarModule,
    MatAutocompleteModule, // Para Bairro
    MatDialogModule // Para a Etiqueta
  ],
  templateUrl: './pedido-create.component.html',
  styleUrl: './pedido-create.component.css'
})
export class PedidoCreateComponent implements OnInit { 
  
  // Objecto para os dados do formulário
  pedido: any = this.criarObjetoPedidoVazio();

  // Lógica da Busca de Cliente
  termoBusca: string = '';
  clientesEncontrados: Cliente[] = [];
  buscaAtiva = false;

  // Lógica do Autocomplete de Bairro
  bairroControl = new FormControl(''); 
  bairrosDisponiveis: string[] = []; 
  bairrosFiltrados!: Observable<string[]>;

  constructor(
    private pedidoService: PedidoService,
    private clienteService: ClienteService,
    private bairroService: BairroService,
    private snackBar: MatSnackBar,
    private router: Router,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Carrega os bairros para o autocomplete
    this.carregarBairros();
    
    // Configura o filtro do autocomplete
    this.bairrosFiltrados = this.bairroControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterBairros(value || '')),
    );
  }
  
  criarObjetoPedidoVazio() {
    return {
      clienteId: null,
      valor: 0,
      quantidade_caixas: 1,
      status_pagamento: 'na_entrega',
      tem_fardo: false
    };
  }

  // --- Lógica de Bairros ---
  carregarBairros(): void {
    this.bairroService.listarBairros().subscribe(
      nomes => {
        this.bairrosDisponiveis = nomes;
        this.bairroControl.updateValueAndValidity({ onlySelf: true, emitEvent: true });
      },
      error => console.error("Erro ao carregar bairros:", error)
    );
  }

  private _filterBairros(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.bairrosDisponiveis.filter(option => option.toLowerCase().includes(filterValue));
  }

  // --- Lógica de Clientes ---
  buscarCliente() {
    if (this.termoBusca.length < 3) {
      this.clientesEncontrados = [];
      this.buscaAtiva = false;
      return;
    }
    this.buscaAtiva = true;
    this.clienteService.buscarClientes(this.termoBusca).subscribe((clientes: Cliente[]) => {
      this.clientesEncontrados = clientes;
    });
  }

  selecionarCliente(cliente: Cliente) {
    this.termoBusca = cliente.nome;
    this.pedido.clienteId = cliente.id;
    this.clientesEncontrados = [];
    this.buscaAtiva = false;
    // Preenche o bairro automaticamente ao selecionar o cliente
    this.bairroControl.setValue(cliente.bairro || ''); 
  }

  // --- Acções do Formulário ---
  salvarPedido() {
    if (!this.pedido.clienteId) {
      this.snackBar.open('Por favor, selecione um cliente antes de salvar.', 'Fechar', { duration: 3000 });
      return;
    }

    // Pega o valor final do bairro
    this.pedido.bairro = this.bairroControl.value || ''; 

    this.pedidoService.criarPedido(this.pedido).subscribe({
      next: (res) => {
        this.snackBar.open('Pedido salvo com sucesso!', 'OK', { duration: 2000 });

        // Busca os dados completos do cliente para enviar para a etiqueta
        this.clienteService.getClientePorId(this.pedido.clienteId).subscribe(cliente => {
          const dadosParaEtiqueta: Pedido = {
            id: res.pedidoId,
            ...this.pedido,
            criado_em: new Date().toISOString(), // Simula a data
            nomeCliente: cliente.nome,
            enderecoCliente: { rua: cliente.endereco, bairro: cliente.bairro }
          };
          this.abrirModalEtiqueta(dadosParaEtiqueta);
        });
        
        // Limpa o formulário
        this.pedido = this.criarObjetoPedidoVazio();
        this.termoBusca = '';
        this.bairroControl.setValue('');
      },
      error: (err: HttpErrorResponse) => {
        this.snackBar.open('Erro ao salvar pedido. Tente novamente.', 'Fechar', { duration: 3000 });
      },
    });
  }

  // Abre o modal da etiqueta
  abrirModalEtiqueta(pedidoData: Pedido): void {
    this.dialog.open(EtiquetaDialogComponent, {
      width: '500px',
      data: { pedido: pedidoData } // Envia os dados para o modal
    });
  }

  // Atalhos de navegação
  goToEditClient(): void {
    if (this.pedido.clienteId) {
      this.router.navigate(['/clientes/editar', this.pedido.clienteId]);
    }
  }

  goToCreateClient(): void {
    this.router.navigate(['/clientes/novo']);
  }
}

