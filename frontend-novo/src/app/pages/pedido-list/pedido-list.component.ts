import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router'; 
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../services/pedido.service';
import { ClienteService } from '../../services/cliente.service';
import { Pedido, Cliente } from '../../types';

// Imports do Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatMenuModule } from '@angular/material/menu'; 
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; 
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; 

// Importe o seu componente de etiqueta/dialog
import { EtiquetaDialogComponent } from '../../components/etiqueta-dialog/etiqueta-dialog.component';

@Component({
  selector: 'app-pedido-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatButtonModule, MatIconModule, MatTableModule, MatTabsModule,
    MatFormFieldModule, MatInputModule, MatPaginatorModule,
    MatMenuModule, MatDialogModule, MatSnackBarModule 
  ],
  templateUrl: './pedido-list.component.html',
  styleUrl: './pedido-list.component.css'
})
export class PedidoListComponent implements OnInit {
  pedidos: Pedido[] = [];
  pedidosFiltrados: Pedido[] = []; 
  displayedColumns: string[] = ['id', 'criado_em', 'nomeCliente', 'valor', 'status_entrega', 'acoes'];
  
  totalPedidos = 0;
  pageSize = 10;
  pageIndex = 0;
  statusFiltro: string = 'preparado'; 
  statusList = [
    { value: 'todos', label: 'Todos' },
    { value: 'preparado', label: 'Em Preparação' },
    { value: 'saiu', label: 'Em Transito' },
    { value: 'entregue', label: 'Entregue' },
    { value: 'cancelado', label: 'Cancelado' }
  ];
  termoBuscaCliente: string = '';

  constructor(
    private pedidoService: PedidoService,
    private clienteService: ClienteService,
    private router: Router, 
    private dialog: MatDialog, 
    private snackBar: MatSnackBar 
  ) {}

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    this.pedidoService.listarPedidos(this.pageIndex + 1, this.pageSize, this.statusFiltro)
      .subscribe(resposta => {
         if (resposta.dados && resposta.dados.length > 0) {
           this.clienteService.listarTodosClientes().subscribe({
             // --- Bloco de Sucesso ---
             next: (clientes: Cliente[]) => {
               const mapaClientes = new Map(clientes.map(c => [c.id, c.nome]));
               const mapaEnderecos = new Map(clientes.map(c => [c.id, { rua: c.endereco, bairro: c.bairro }]));

               this.pedidos = resposta.dados.map(pedido => ({
                 ...pedido,
                 nomeCliente: mapaClientes.get(pedido.clienteId) || 'Cliente não encontrado',
                 enderecoCliente: mapaEnderecos.get(pedido.clienteId)
               } as Pedido));
               this.totalPedidos = resposta.total;
               this.aplicarFiltroNome();
             },
             // --- ADICIONADO Bloco de Erro ---
             error: (err) => {
               console.error("ERRO CRÍTICO AO BUSCAR CLIENTES:", err);
               this.snackBar.open('Erro ao carregar nomes de clientes. Mostrando pedidos sem nome.', 'Fechar', { duration: 5000 });
               
               // Mesmo com erro, mostramos os pedidos (sem nomes)
               this.pedidos = resposta.dados.map(pedido => ({
                 ...pedido,
                 nomeCliente: 'Erro (Ref: ' + pedido.clienteId.substring(0, 4) + ')', // Mostra um nome de erro
                 enderecoCliente: undefined
               } as Pedido));
               this.totalPedidos = resposta.total;
               this.aplicarFiltroNome();
             }
           });
         } else {
           this.pedidos = [];
           this.pedidosFiltrados = [];
           this.totalPedidos = 0;
         }
      });
  }
  
  aplicarFiltroNome(): void {
    const termo = this.termoBuscaCliente.toLowerCase().trim();
    if (!termo) {
      this.pedidosFiltrados = [...this.pedidos];
    } else {
      this.pedidosFiltrados = this.pedidos.filter(pedido =>
        pedido.nomeCliente?.toLowerCase().includes(termo)
      );
    }
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.carregarDados();
  }

  onStatusTabChange(status: string): void {
    this.statusFiltro = status;
    this.pageIndex = 0;
    this.termoBuscaCliente = ''; // Limpa a busca
    this.carregarDados();
  }
  
  onSearchChange(): void {
    this.aplicarFiltroNome();
  }

  // --- Funções de Acção ---

  abrirModalEtiqueta(pedido: Pedido): void {
    this.dialog.open(EtiquetaDialogComponent, {
      width: '500px',
      data: { pedido: pedido } 
    });
  }

  editarPedido(pedido: Pedido): void {
    this.router.navigate(['/pedidos/editar', pedido.id]);
  }

  marcarComoSaiu(pedido: Pedido): void {
    this.pedidoService.marcarComoSaiu(pedido.id).subscribe({
      next: () => {
        this.snackBar.open(`Pedido #${pedido.id.substring(0,6)} saiu para entrega!`, 'OK', { duration: 3000 });
        this.carregarDados(); // Recarrega a lista
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Erro ao actualizar status.', 'Fechar', { duration: 3000 });
      }
    });
  }

  marcarComoEntregue(pedido: Pedido): void {
    this.pedidoService.marcarComoEntregue(pedido.id).subscribe({
      next: () => {
        this.snackBar.open(`Pedido #${pedido.id.substring(0,6)} marcado como entregue!`, 'OK', { duration: 3000 });
        this.carregarDados(); // Recarrega a lista
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Erro ao actualizar status.', 'Fechar', { duration: 3000 });
      }
    });
  }
}

