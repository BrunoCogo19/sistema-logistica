import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  templateUrl: './footer.component.html'
})
export class FooterComponent {
  // Variável que guarda o ano atual dinamicamente
  anoAtual: number = new Date().getFullYear();
}