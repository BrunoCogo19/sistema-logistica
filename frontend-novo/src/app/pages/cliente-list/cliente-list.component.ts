import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ClienteService } from '../../services/cliente.service';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

@Component({
  selector: 'app-cliente-list',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatTableModule, 
    MatButtonModule, 
    MatIconModule, 
    MatPaginatorModule // ADICIONE AQUI
  ],
  templateUrl: './cliente-list.component.html',
  styleUrl: './cliente-list.component.css'
})
export class ClienteListComponent implements OnInit {
  clientes: any[] = []
  displayedColumns: string[] = ['nome', 'telefone', 'endereco', 'acoes'];;
  totalClientes = 0;
  pageSize = 10;
  pageIndex = 0;

  constructor(private clienteService: ClienteService) {}

ngOnInit(): void {
    this.carregarClientes();
  }

  // ATUALIZE A FUNÇÃO DE CARREGAMENTO
  carregarClientes(): void {
   this.clienteService.listarClientesPaginado(this.pageIndex + 1, this.pageSize)
      .subscribe(resposta => {
        this.clientes = resposta.dados;
        this.totalClientes = resposta.total;
      });
  }

  // CRIE A FUNÇÃO QUE SERÁ CHAMADA QUANDO O USUÁRIO MUDAR DE PÁGINA
  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.carregarClientes();
  }
}