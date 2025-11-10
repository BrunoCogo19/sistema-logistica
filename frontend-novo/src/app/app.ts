import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
import { Observable, Subscription } from 'rxjs'; 
import { map, shareReplay } from 'rxjs/operators'; 

// NÃO DEVE HAVER IMPORTS DE QR CODE AQUI

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule, 
    CommonModule, 
    MatToolbarModule,
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatListModule
  ],
  templateUrl: './app.html', 
  styleUrl: './app.css'     
})
export class AppComponent implements OnDestroy {

  isHandset$: Observable<boolean>;
  sidenavMode: 'over' | 'push' | 'side' = 'side';
  sidenavOpened: boolean = true;
  private breakpointSubscription: Subscription | undefined; 

  constructor(
    private breakpointObserver: BreakpointObserver
  ) {
    this.isHandset$ = this.breakpointObserver.observe(Breakpoints.Handset)
      .pipe(
        map(result => result.matches),
        shareReplay()
      );

    this.breakpointSubscription = this.isHandset$.subscribe(isHandset => {
       if (isHandset) {
         this.sidenavMode = 'over';
         this.sidenavOpened = false;
       } else {
         this.sidenavMode = 'side';
         this.sidenavOpened = true;
       }
    });
  }

  ngOnDestroy(): void {
    if (this.breakpointSubscription) {
      this.breakpointSubscription.unsubscribe();
    }
  }

  closeSidenavIfNeeded(sidenav: any): void {
     if (this.sidenavMode === 'over') {
        sidenav.close();
     }
  }
}