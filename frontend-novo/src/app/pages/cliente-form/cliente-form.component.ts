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
    MatSnackBarModule // <-- 2. ADICIONE O MÓDULO AQUI
  ],
  templateUrl: './cliente-form.component.html',
  styleUrl: './cliente-form.component.css'
})
export class ClienteFormComponent implements OnInit { // 3. Implemente OnInit
  cliente: any = { // 'any' para facilitar, já que agora pode ter um ID
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
  ) {}

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
    const acao = this.isEditMode 
      ? this.clienteService.atualizarCliente(this.cliente.id, this.cliente)
      : this.clienteService.criarCliente(this.cliente);

    acao.subscribe({
      next: () => {
        const mensagem = this.isEditMode ? 'Cliente atualizado com sucesso!' : 'Cliente salvo com sucesso!';
        this.snackBar.open(mensagem, 'OK', { duration: 3000 });
        this.router.navigate(['/clientes']); // Mantém o redirecionamento
      },
      error: (err) => {
        const mensagemErro = this.isEditMode ? 'Erro ao atualizar cliente.' : 'Erro ao salvar cliente.';
        this.snackBar.open(mensagemErro, 'Fechar', { duration: 3000 });
        console.error(err);
      }
    });
  }
}