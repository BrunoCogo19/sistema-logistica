import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms'; // Necessário para ngModel da busca
import { PedidoService } from '../../services/pedido.service';
import { ClienteService } from '../../services/cliente.service';
import { Pedido, Cliente } from '../../types';

// Imports do Angular Material
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table'; // Para a tabela
import { MatTabsModule } from '@angular/material/tabs';   // Para as abas
import { MatFormFieldModule } from '@angular/material/form-field'; // Para o campo de busca
import { MatInputModule } from '@angular/material/input';     // Para o campo de busca
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator'; // Para paginação


@Component({
  selector: 'app-pedido-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, // FormsModule adicionado
    MatButtonModule, MatIconModule, MatTableModule, MatTabsModule,
    MatFormFieldModule, MatInputModule, MatPaginatorModule,   ],
  templateUrl: './pedido-list.component.html',
  styleUrl: './pedido-list.component.css'
})
export class PedidoListComponent implements OnInit {
  // Dados brutos combinados (pedidos + nomes de cliente) da página atual
  pedidosCompletos: Pedido[] = [];
  // Dados que serão exibidos na tabela (após filtro de nome)
  pedidosFiltrados: Pedido[] = [];

  // Colunas a serem exibidas na tabela
  displayedColumns: string[] = ['id', 'criado_em', 'nomeCliente', 'valor', 'status_entrega'];

  // Controle de Paginação
  totalPedidos = 0;
  pageSize = 10;
  pageIndex = 0;

  // Controle de Filtro de Status
  statusFiltro: string = 'preparado'; // Começa em 'Em Aberto'
statusList = [
  { value: 'todos', label: 'Todos' },
  { value: 'preparado', label: 'Preparado' },
  { value: 'saiu', label: 'Em transito' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'cancelado', label: 'Cancelado' } // <-- ADICIONE ESTA LINHA
];

  // Controle de Busca por Nome
  termoBuscaCliente: string = '';

  constructor(
    private pedidoService: PedidoService,
    private clienteService: ClienteService
  ) {}

  ngOnInit(): void {
    this.carregarPedidos();
  }

  // Carrega os pedidos da API (baseado na página e status) e combina com nomes de cliente
  carregarPedidos(): void {
    this.pedidoService.listarPedidos(this.pageIndex + 1, this.pageSize, this.statusFiltro)
      .subscribe(resposta => {
        if (resposta.dados && resposta.dados.length > 0) {
          this.clienteService.listarTodosClientes().subscribe((clientes: Cliente[]) => {
            const mapaClientes = new Map(clientes.map(c => [c.id, c.nome]));
            // Guarda os dados combinados
            this.pedidosCompletos = resposta.dados.map(pedido => ({
              ...pedido,
              nomeCliente: mapaClientes.get(pedido.clienteId) || 'Cliente não encontrado',
              enderecoCliente: undefined // Não precisamos mais do endereço aqui
            } as Pedido));
            this.totalPedidos = resposta.total;
            // Aplica o filtro de nome inicial
            this.aplicarFiltroNome();
          });
        } else {
          this.pedidosCompletos = [];
          this.pedidosFiltrados = [];
          this.totalPedidos = 0;
        }
      });
  }

  // Filtra a lista 'pedidosCompletos' com base no 'termoBuscaCliente'
  aplicarFiltroNome(): void {
    const termo = this.termoBuscaCliente.toLowerCase().trim();
    if (!termo) {
      this.pedidosFiltrados = [...this.pedidosCompletos]; // Se busca vazia, mostra todos da página
    } else {
      this.pedidosFiltrados = this.pedidosCompletos.filter(pedido =>
        pedido.nomeCliente?.toLowerCase().includes(termo)
      );
    }
  }

  // Chamado quando o usuário muda de página no paginador
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.carregarPedidos(); // Busca os dados da nova página
  }

  // Chamado quando o usuário clica em uma aba de status
  onStatusTabChange(status: string): void {
    this.statusFiltro = status;
    this.pageIndex = 0; // Volta para a primeira página
    this.termoBuscaCliente = ''; // Limpa a busca ao mudar de status
    this.carregarPedidos(); // Busca os dados do novo status
  }

  // Chamado quando o usuário digita na busca (ou aperta Enter, etc.)
  onSearchChange(): void {
    // A busca agora só filtra os dados já carregados na página atual
    this.aplicarFiltroNome();
  }

 
}