import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Necessário para usar *ngFor se for Standalone Component

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  
  // Dados dos Banners Principais
  banners = [
    { src: 'assets/imagens/CarroselBanner/100Reais.jpg', alt: 'Banner 100 Reais' },
    { src: 'assets/imagens/CarroselBanner/fimSemana.jpg', alt: 'Banner Fim de Semana' },
    { src: 'assets/imagens/CarroselBanner/hortfrutCarrosel.jpg', alt: 'Banner Hortifruti' },
    { src: 'assets/imagens/CarroselBanner/nacional.jpg', alt: 'Banner Nacional' }
  ];

  // Dados das Promoções
  promocoes = [
    { src: 'assets/imagens/CarroselProdutos/1.jpg', alt: 'Produto 1' },
    { src: 'assets/imagens/CarroselProdutos/1.jpg', alt: 'Produto 1 Repetido' },
    { src: 'assets/imagens/CarroselProdutos/2.jpg', alt: 'Produto 2' },
    { src: 'assets/imagens/CarroselProdutos/3.jpg', alt: 'Produto 3' },
    { src: 'assets/imagens/CarroselProdutos/4.jpg', alt: 'Produto 4' },
    { src: 'assets/imagens/CarroselProdutos/5.jpg', alt: 'Produto 5' }
  ];

  // Dados Hortifruti
  hortifruti = [
    { src: 'assets/imagens/CarroselHortifruti/1.jpg', alt: 'Hortifruti 1' },
    { src: 'assets/imagens/CarroselHortifruti/2.jpg', alt: 'Hortifruti 2' },
    { src: 'assets/imagens/CarroselHortifruti/3.jpg', alt: 'Hortifruti 3' },
    { src: 'assets/imagens/CarroselHortifruti/4.jpg', alt: 'Hortifruti 4' }
  ];
}