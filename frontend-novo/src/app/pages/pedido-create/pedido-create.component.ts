import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router'; 
import { PedidoService } from '../../services/pedido.service';
import { ClienteService } from '../../services/cliente.service';
import { BairroService } from '../../services/bairro.service';
import { Cliente, Pedido } from '../../types';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

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
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; 
import { EtiquetaDialogComponent } from '../../components/etiqueta-dialog/etiqueta-dialog.component';

// NÃO DEVE HAVER IMPORTAÇÕES DE QR CODE AQUI

@Component({
  selector: 'app-pedido-create',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatAutocompleteModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatCheckboxModule, MatButtonModule, MatIconModule, MatListModule,
    MatSnackBarModule, MatDialogModule 
  ],
  templateUrl: './pedido-create.component.html',
  styleUrl: './pedido-create.component.css'
})
export class PedidoCreateComponent implements OnInit { 
  // Usa o objecto 'pedido', e não 'dadosFomulario'
  pedido: Partial<Pedido> = this.criarObjetoPedidoVazio();
  termoBusca: string = '';
  clientesEncontrados: Cliente[] = [];
  buscaAtiva = false;
  bairroControl = new FormControl('');
  bairrosDisponiveis: string[] = [];
  bairrosFiltrados!: Observable<string[]>;
  isEditMode = false; 
  pedidoId: string | null = null; 

  constructor(
    private pedidoService: PedidoService,
    private clienteService: ClienteService,
    private bairroService: BairroService,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute, 
    public dialog: MatDialog 
  ) {}

  // Este é o ÚNICO ngOnInit
  ngOnInit(): void {
    this.pedidoId = this.route.snapshot.paramMap.get('id');
    
    if (this.pedidoId) {
      // MODO DE EDIÇÃO
      this.isEditMode = true;
      this.pedidoService.getPedidoPorId(this.pedidoId).subscribe(pedidoData => {
        this.pedido = pedidoData;
        if (pedidoData.clienteId) {
          this.clienteService.getClientePorId(pedidoData.clienteId).subscribe(clienteData => {
            this.termoBusca = clienteData.nome; 
            this.bairroControl.setValue(clienteData.bairro || ''); 
          });
        }
      });
    }

    this.carregarBairros(); 
    this.bairrosFiltrados = this.bairroControl.valueChanges.pipe(
      startWith(''),
      map(value => this._filterBairros(value || '')),
    );
  }
  
  carregarBairros(): void {
    this.bairroService.listarNomesDeBairros().subscribe(nomes => {
      this.bairrosDisponiveis = nomes;
    });
  }

  criarObjetoPedidoVazio(): Partial<Pedido> {
    return {
      clienteId: undefined, 
      valor: 0,
      quantidade_caixas: 1,
      status_pagamento: 'na_entrega',
      tem_fardo: false,
    };
  }

  salvarPedido() {
    
    if (this.isEditMode && this.pedidoId) {
      // --- LÓGICA DE ATUALIZAÇÃO ---
      const payload: Partial<Pedido> = {
        valor: this.pedido.valor,
        quantidade_caixas: this.pedido.quantidade_caixas,
        status_pagamento: this.pedido.status_pagamento,
        tem_fardo: this.pedido.tem_fardo
      };

      this.pedidoService.atualizarPedido(this.pedidoId, payload).subscribe({
        next: () => {
          this.snackBar.open('Pedido atualizado com sucesso!', 'OK', { duration: 3000 });
          this.router.navigate(['/pedidos']);
        },
        error: (err: HttpErrorResponse) => {
          console.error("Erro ao atualizar:", err);
          this.snackBar.open('Erro ao atualizar o pedido.', 'Fechar', { duration: 3000 });
        }
      });

    } else {
      // --- LÓGICA DE CRIAÇÃO ---
      if (!this.pedido.clienteId) {
        this.snackBar.open('Por favor, selecione um cliente antes de salvar.', 'Fechar', { duration: 3000 });
        return;
      }
      
      // Adiciona o bairro ao pedido antes de salvar (se a regra de negócio exigir)
      this.pedido.bairro = this.bairroControl.value || '';

      this.pedidoService.criarPedido(this.pedido).subscribe({
        next: (res) => {
          this.snackBar.open('Pedido salvo com sucesso!', 'OK', { duration: 2000 });
          
          this.clienteService.getClientePorId(this.pedido.clienteId!).subscribe(cliente => {
            const dadosParaEtiqueta = {
              id: res.pedidoId,
              ...this.pedido,
              criado_em: new Date().toISOString(),
              nomeCliente: cliente.nome,
              enderecoCliente: { rua: cliente.endereco, bairro: cliente.bairro }
            } as Pedido;
            
            this.abrirModalEtiqueta(dadosParaEtiqueta);
            
            this.pedido = this.criarObjetoPedidoVazio();
            this.termoBusca = '';
            this.bairroControl.setValue('');
          });
        },
        error: (err: HttpErrorResponse) => {
          this.snackBar.open('Erro ao salvar pedido. Tente novamente.', 'Fechar', { duration: 3000 });
        },
      });
    }
  }
  
  // --- Funções de Apoio ---

  buscarCliente() {
    if (this.isEditMode) return; 
    
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
    if (this.isEditMode) return; 

    this.termoBusca = cliente.nome;
    this.pedido.clienteId = cliente.id; 
    this.bairroControl.setValue(cliente.bairro || ''); 
    this.clientesEncontrados = [];
    this.buscaAtiva = false;
  }

  abrirModalEtiqueta(pedidoData: Pedido): void {
    this.dialog.open(EtiquetaDialogComponent, {
      width: '500px',
      data: { pedido: pedidoData }
    });
  }

  private _filterBairros(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.bairrosDisponiveis.filter(option => option.toLowerCase().includes(filterValue));
  }

  goToEditClient(): void {
    if (this.pedido.clienteId) {
      this.router.navigate(['/clientes/editar', this.pedido.clienteId]);
    }
  }
  
  goToCreateClient(): void {
    this.router.navigate(['/clientes/novo']);
  }
}