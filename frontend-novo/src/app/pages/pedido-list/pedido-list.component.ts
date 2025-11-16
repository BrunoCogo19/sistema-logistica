import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common'; // Adiciona Pipes
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PedidoService } from '../../services/pedido.service';
import { ClienteService } from '../../services/cliente.service';
import { Pedido, Cliente } from '../../types';
import { forkJoin } from 'rxjs';
import { MotoristaService } from '../../services/motorista.service';
import { Motorista } from '../../types';
import { PagamentoDialogComponent, PagamentoDialogData } from '../../components/pagamento-dialog/pagamento-dialog.component';

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
import { MatDividerModule } from '@angular/material/divider';

// Importe os seus componentes de diálogo
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { EtiquetaDialogComponent } from '../../components/etiqueta-dialog/etiqueta-dialog.component';

@Component({
  selector: 'app-pedido-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatButtonModule, MatIconModule, MatTableModule, MatTabsModule,
    MatFormFieldModule, MatInputModule, MatPaginatorModule,
    MatMenuModule, MatDialogModule, MatSnackBarModule,
    MatDividerModule // Importa o componente de diálogo
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
    { value: 'preparado', label: 'Em separação' },
    { value: 'saiu', label: 'Saiu para entrega' },
    { value: 'entregue', label: 'Entrega Concluida' },
    { value: 'cancelado', label: 'Cancelado' }
  ];
  termoBuscaCliente: string = '';

  constructor(
    private pedidoService: PedidoService,
    private clienteService: ClienteService,
    private router: Router,
    private motoristaService: MotoristaService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void { this.carregarDados(); }

  carregarDados(): void {
    this.pedidoService.listarPedidos(this.pageIndex + 1, this.pageSize, this.statusFiltro)
      .subscribe(resposta => {

        if (!resposta.dados || resposta.dados.length === 0) {
          this.pedidos = [];
          this.pedidosFiltrados = [];
          this.totalPedidos = 0;
          return; // Sai da função se não houver pedidos
        }

        // --- MELHORIA COM forkJoin ---
        // Vamos buscar clientes E motoristas ao mesmo tempo.
        const clientes$ = this.clienteService.listarTodosClientes();
        const motoristas$ = this.motoristaService.listarMotoristas(); // <-- NOVO

        forkJoin({
          clientes: clientes$,
          motoristas: motoristas$ // <-- NOVO
        }).subscribe({
          next: ({ clientes, motoristas }) => { // <-- Recebe os dois

            // 1. Mapa de Clientes (como antes)
            const mapaClientes = new Map(clientes.map(c => [c.id!, c.nome]));
            const mapaEnderecos = new Map(clientes.map(c => [c.id!, { rua: c.endereco, bairro: c.bairro }]));

            // 2. Mapa de Motoristas (NOVO)
            const mapaMotoristas = new Map(motoristas.map(m => [m.id, m.nome]));

            // 3. Mapeia os Pedidos (Atualizado)
            this.pedidos = resposta.dados.map(pedido => ({
              ...pedido,
              nomeCliente: mapaClientes.get(pedido.clienteId) || 'Cliente não encontrado',
              enderecoCliente: mapaEnderecos.get(pedido.clienteId),

              // --- A GRANDE MUDANÇA ESTÁ AQUI ---
              nomeMotorista: pedido.motorista_id
                ? mapaMotoristas.get(pedido.motorista_id) || 'Não atribuído'
                : 'Não atribuído'
            } as Pedido));

            this.totalPedidos = resposta.total;
            this.aplicarFiltroNome();
          },
          error: (err: any) => {
            // (Este é o teu bloco de erro antigo, agora com fallback para motorista)
            console.error("ERRO CRÍTICO AO BUSCAR DADOS (Clientes ou Motoristas):", err);
            this.snackBar.open('Erro ao carregar dados de clientes/motoristas.', 'Fechar', { duration: 5000 });

            this.pedidos = resposta.dados.map(pedido => ({
              ...pedido,
              nomeCliente: 'Erro (Ref: ' + pedido.clienteId.substring(0, 4) + ')',
              nomeMotorista: 'Erro' // <-- NOVO
            } as Pedido));
            this.totalPedidos = resposta.total;
            this.aplicarFiltroNome();
          }
        });
        // --- FIM DO forkJoin ---
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
    this.termoBuscaCliente = '';
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
    this.router.navigate(['/pedidos/editar', pedido.id!]); // Corrigido com !
  }

  marcarComoSaiu(pedido: Pedido): void {
    this.pedidoService.marcarComoSaiu(pedido.id!).subscribe({
      next: () => {
        this.snackBar.open(`Pedido #${pedido.id!.substring(0, 6)} saiu para entrega!`, 'OK', { duration: 3000 });
        this.carregarDados();
      },
      error: (err) => {
        // --- CORREÇÃO APLICADA ---
        console.error("Erro ao marcar como 'Saiu':", err);
        // Tenta ler a mensagem de erro específica da API
        const mensagemApi = err.error?.message || 'Erro ao atualizar status.';
        // Mostra a mensagem da API (ou a genérica se falhar)
        this.snackBar.open(mensagemApi, 'Fechar', { duration: 5000 }); // Aumentei o tempo
      }
    });
  }

marcarComoEntregue(pedido: Pedido): void {
    
    // 1. VERIFICA O STATUS DO PAGAMENTO
    // Se o status não for 'na_entrega' (ou o nome que deste), apenas conclui.
    if (pedido.status_pagamento !== 'na_entrega') {
      
      // Chama o serviço diretamente (sem pop-up)
      this.pedidoService.marcarComoEntregue(pedido.id!, null, null).subscribe({
        next: () => {
          this.snackBar.open(`Pedido #${pedido.id!.substring(0,6)} marcado como entregue!`, 'OK', { duration: 3000 });
          this.carregarDados(); // Recarrega a lista
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Erro ao actualizar status.', 'Fechar', { duration: 3000 });
        }
      });

    } else {
      
      // 2. ABRE O POP-UP DE PAGAMENTO
      // O status é 'na_entrega', então precisamos de perguntar "Como foi pago?"
      const dialogRef = this.dialog.open(PagamentoDialogComponent, {
        width: '450px',
        data: pedido // Envia o objeto 'pedido' inteiro para o diálogo
      });

      // 3. DEPOIS QUE O POP-UP FECHAR...
      dialogRef.afterClosed().subscribe((resultado: PagamentoDialogData) => {
        
        // Se o admin clicou em "Confirmar", 'resultado' terá os dados.
        // Se ele clicou em "Cancelar", 'resultado' será 'undefined'.
        if (resultado) {
          
          // Chama o serviço com os dados de pagamento
          this.pedidoService.marcarComoEntregue(pedido.id!, resultado.valor, resultado.forma).subscribe({
            next: () => {
              this.snackBar.open(`Pedido #${pedido.id!.substring(0,6)} entregue (Pago ${resultado.forma}).`, 'OK', { duration: 3000 });
              this.carregarDados(); // Recarrega a lista
            },
            error: (err) => {
              console.error(err);
              this.snackBar.open('Erro ao actualizar status com pagamento.', 'Fechar', { duration: 3000 });
            }
          });
        }
        // Se 'resultado' for 'undefined' (cancelou), não faz nada.
      });
    }
  }

  cancelarPedido(pedido: Pedido): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '350px',
      data: {
        title: 'Confirmar Cancelamento',
        message: `Tem a certeza de que quer cancelar o pedido? Esta ação não pode ser desfeita.` // Corrigido com !
      }
    });

    dialogRef.afterClosed().subscribe(resultado => {
      if (resultado === true) {
        this.pedidoService.cancelarPedido(pedido.id!).subscribe({ // Corrigido com !
          next: () => {
            this.snackBar.open(`Pedido #${pedido.id!.substring(0, 6)} foi cancelado.`, 'OK', { duration: 3000 }); // Corrigido com !
            this.carregarDados();
          },
          error: (err) => {
            console.error(err);
            this.snackBar.open(err.error?.message || 'Erro ao cancelar o pedido.', 'Fechar', { duration: 3000 });
          }
        });
      }
    });
  }
}