import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../services/pedido.service';
import { ClienteService } from '../../services/cliente.service';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list'; 
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Cliente, Pedido } from '../../types';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'app-pedido-create',
  standalone: true,
  // 2. ADICIONE OS MÓDULOS AO ARRAY DE IMPORTS
 imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSnackBarModule,
    QRCodeComponent
],
  templateUrl: './pedido-create.component.html',
  styleUrls: ['./pedido-create.component.css']
})
export class PedidoCreateComponent implements OnInit {
  // Objeto para guardar os dados do formulário
  pedido: any = this.criarObjetoPedidoVazio();
  dadosFomulario = {
    valor: "",
    caixa: "",
    pagar: ""
  }
  qrcode: string = '';

  termoBusca: string = '';
  clientesEncontrados: Cliente[] = [];
  buscaAtiva = false;

  // 3. INJETE O MatSnackBar NO CONSTRUTOR
  constructor(
    private pedidoService: PedidoService,
    private clienteService: ClienteService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  // 4. CRIE UMA FUNÇÃO PARA LIMPAR/RESETAR O FORMULÁRIO
  criarObjetoPedidoVazio() {
    return {
      clienteId: null,
      valor: 0,
      quantidade_caixas: 1,
      status_pagamento: 'na_entrega',
      tem_fardo: false
    };
  }

 buscarCliente() {
    if (this.termoBusca.length < 3) {
      this.clientesEncontrados = [];
      this.buscaAtiva = false;
      return;
    }
    this.buscaAtiva = true;
    this.clienteService.buscarClientes(this.termoBusca).subscribe(clientes => {
      this.clientesEncontrados = clientes;
    });
  }

  selecionarCliente(cliente: Cliente) {
    this.termoBusca = cliente.nome;
    this.pedido.clienteId = cliente.id;
    this.clientesEncontrados = [];
    this.buscaAtiva = false;
  }

  // 5. ATUALIZE A FUNÇÃO salvarPedido
  salvarPedido() {
    if (!this.pedido.clienteId) {
      this.snackBar.open('Por favor, selecione um cliente antes de salvar.', 'Fechar', { duration: 3000 });
      return;
    }

    this.pedidoService.criarPedido(this.pedido).subscribe({
      next: (res) => {
        // Mostra a notificação de sucesso
        this.snackBar.open('Pedido salvo com sucesso!', 'OK', {
          duration: 3000 // A notificação sumirá após 3 segundos
        });
        
        // Limpa o formulário para o próximo pedido
        this.pedido = this.criarObjetoPedidoVazio();
        this.termoBusca = ''; // Limpa também o campo de busca
      },
      error: (err) => {
        // Mostra a notificação de erro
        this.snackBar.open('Erro ao salvar pedido. Tente novamente.', 'Fechar', {
          duration: 3000
        });
      },
    });
  }
goToEditClient(): void {
    if (this.pedido.clienteId) {
      this.router.navigate(['/clientes/editar', this.pedido.clienteId]);
    }
  }
  goToCreateClient(): void {
    this.router.navigate(['/clientes/novo']);
  }

  //QRcode para cada pedido criado
 
  ngOnInit(): void {
    if(this.dadosFomulario.caixa && this.dadosFomulario.valor){
    this.qrcode =
      `VALOR DA COMPRA: ${this.dadosFomulario.valor}\n` +
      `QUANTIDADE DE CAIXAS: ${this.dadosFomulario.caixa}\n` +
      `PAGAMENTO: ${this.dadosFomulario.pagar}`;}
      else{
        this.qrcode = 'Erro: Preencher dados obrigatorios'
      }

      console.log(this.qrcode)
  }
}
