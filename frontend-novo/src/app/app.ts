import { Component, OnDestroy } from '@angular/core'; // Remova OnInit e ChangeDetectorRef se não usar mais
import { RouterModule } from '@angular/router'; // Pacote completo de rotas
import { CommonModule } from '@angular/common'; // Necessário para o pipe async

// Imports do Angular Material para o layout
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';

// Imports do CDK para responsividade
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, Subscription } from 'rxjs'; // Para gerenciar a inscrição
import { map, shareReplay } from 'rxjs/operators'; // Para manipular o Observable

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule, // Garante que routerLink e router-outlet funcionem
    CommonModule, // Necessário para usar o pipe async no template

    // Módulos do Material necessários para este componente
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
  ],
  templateUrl: './app.html', // Usando o nome correto do seu ficheiro de template
  styleUrl: './app.css'     // Usando o nome correto do seu ficheiro de estilo
})
export class AppComponent implements OnDestroy {

  // Observable que emite true se a tela for pequena (Handset)
  isHandset$: Observable<boolean>;

  // Propriedades para controlar o Sidenav (ainda podem ser úteis)
  sidenavMode: 'over' | 'push' | 'side' = 'side';
  sidenavOpened: boolean = true;
  private breakpointSubscription: Subscription | undefined; // Para limpar a inscrição

  constructor(
    private breakpointObserver: BreakpointObserver
  ) {
    // Inicializa o Observable isHandset$ dentro do construtor
    this.isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
      .pipe(
        map(result => result.matches), // Pega apenas o valor booleano 'matches'
        shareReplay() // Evita múltiplas subscrições e compartilha o último valor emitido
      );

    // Mantém a subscrição para atualizar mode/opened (se necessário)
    this.breakpointSubscription = this.isHandset$.subscribe(isHandset => {
       if (isHandset) {
         this.sidenavMode = 'over';
         this.sidenavOpened = false;
       } else {
         this.sidenavMode = 'side';
         this.sidenavOpened = true;
       }
       // Não precisamos mais do detectChanges() manual aqui
    });
  }

  // Removemos o ngOnInit se ele ficou vazio

  ngOnDestroy(): void {
    // Cancela a inscrição ao destruir o componente para evitar vazamentos de memória
    if (this.breakpointSubscription) {
      this.breakpointSubscription.unsubscribe();
    }
  }

  // Função para fechar o menu APENAS se estiver no modo mobile ('over')
  closeSidenavIfNeeded(sidenav: any): void {
     if (this.sidenavMode === 'over') { // Verifica o modo atual
        sidenav.close();
     }
  }
}
