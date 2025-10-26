import { Component, OnInit } from '@angular/core'; // 1. Importe OnInit
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router'; // 2. Importe ActivatedRoute
import { ClienteService } from '../../services/cliente.service';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Cliente } from '../../types';

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  templateUrl: './cliente-form.component.html',
  styleUrl: './cliente-form.component.css'
})
export class ClienteFormComponent implements OnInit { // 3. Implemente OnInit
  cliente: Cliente = { // 'any' para facilitar, já que agora pode ter um ID
    nome: '',
    telefone: '',
    endereco: '',
    bairro_cep: ''
  };
  isEditMode = false; // Para sabermos se estamos editando ou criando

  constructor(
    private clienteService: ClienteService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar // 4. Injete o ActivatedRoute
  ) { }

  ngOnInit(): void {
    // 5. Verifique a URL quando o componente iniciar
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.clienteService.getClientePorId(id).subscribe(data => {
        this.cliente = data;
      });
    }
  }

  salvar(): void {
    let acao: Observable<any>;
    let payload: Partial<Cliente>; // Objeto que será enviado para a API

    if (this.isEditMode) {
      // 1. Cria uma cópia do objeto do formulário
      payload = { ...this.cliente };

      // 2. Remove os campos que não devem ser atualizados
      delete payload.criado_em;
      delete payload.id; // O ID vai na URL, não no corpo

      // 3. Chama a ação de atualizar com o payload limpo
      acao = this.clienteService.atualizarCliente(this.cliente.id!, payload);
    } else {
      // 4. Para criar, envia o objeto como está
      payload = this.cliente;
      acao = this.clienteService.criarCliente(payload);
    }

    // 5. O subscribe continua o mesmo
    acao.subscribe({
      next: () => {
        const mensagem = this.isEditMode ? 'Cliente atualizado com sucesso!' : 'Cliente salvo com sucesso!';
        this.snackBar.open(mensagem, 'OK', { duration: 3000 });
        this.router.navigate(['/clientes']); // Mantém o redirecionamento
      },
      error: (err: HttpErrorResponse) => {
        const mensagemErro = this.isEditMode ? 'Erro ao atualizar cliente.' : 'Erro ao salvar cliente.';
        this.snackBar.open(mensagemErro, 'Fechar', { duration: 3000 });
        console.error('Erro detalhado:', err); // É uma boa prática logar o erro completo
      }
    });
  }
  formatPhone(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Remove tudo que não for dígito

    if (value.length <= 10) {
      // Formato (XX) XXXX-XXXX para 10 dígitos
      value = value.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    } else {
      // Formato (XX) X XXXX-XXXX para 11 dígitos
      value = value.replace(/^(\d{2})(\d)(\d{4})(\d{4})$/, '($1) $2 $3-$4');
    }

    // Actualiza o valor no nosso objecto cliente (importante para o ngModel)
    this.cliente.telefone = value; 

    // Força a actualização do valor no próprio input (importante para visualização)
    // Usamos um setTimeout para garantir que o Angular processe a mudança do ngModel primeiro
    setTimeout(() => {
      input.value = value;
    }, 0);
  }
}