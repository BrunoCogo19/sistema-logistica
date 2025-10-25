import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PedidoService } from '../../services/pedido.service';
import { ClienteService } from '../../services/cliente.service';
import { Pedido, Cliente } from '../../types';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pedido-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatButtonModule, MatCardModule, MatIconModule,
    MatPaginatorModule, MatFormFieldModule, MatSelectModule, FormsModule // ADICIONE AQUI
  ],
  templateUrl: './pedido-list.component.html',
  styleUrl: './pedido-list.component.css'

})
export class PedidoListComponent implements OnInit {
  pedidos: Pedido[] = [];

  totalPedidos = 0;
  pageSize = 10;
  pageIndex = 0;

  statusFiltro: string = 'todos';

  constructor(
    private pedidoService: PedidoService,
    private clienteService: ClienteService
  ) { }

  ngOnInit(): void {
    this.carregarDados();
  }

  carregarDados(): void {
    this.pedidoService.listarPedidos(this.pageIndex + 1, this.pageSize, this.statusFiltro)
      .subscribe(resposta => {
        const mapaClientes = new Map<string, string>();
        const mapaEnderecos = new Map<string, object>();

        // Buscamos os clientes apenas se houver pedidos para evitar chamadas desnecessárias
        if (resposta.dados && resposta.dados.length > 0) {
          this.clienteService.listarTodosClientes().subscribe((clientes: Cliente[]) => {
            clientes.forEach(c => {
              mapaClientes.set(c.id, c.nome);
              mapaEnderecos.set(c.id, { rua: c.endereco, bairro: c.bairro_cep });
            });

            this.pedidos = resposta.dados.map(pedido => ({
              ...pedido,
              nomeCliente: mapaClientes.get(pedido.clienteId) || 'Cliente não encontrado',
              enderecoCliente: mapaEnderecos.get(pedido.clienteId)
            } as Pedido));;
            this.totalPedidos = resposta.total;
          });
        } else {
          this.pedidos = [];
          this.totalPedidos = 0;
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.carregarDados();
  }

  onFilterChange(): void {
    this.pageIndex = 0; // Volta para a primeira página ao aplicar um novo filtro
    this.carregarDados();
  }
}