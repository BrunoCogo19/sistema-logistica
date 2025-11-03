import { Routes } from '@angular/router';
import { PedidoListComponent } from './pages/pedido-list/pedido-list.component';
import { PedidoCreateComponent } from './pages/pedido-create/pedido-create.component';
import { ClienteListComponent } from './pages/cliente-list/cliente-list.component';
import { ClienteFormComponent } from './pages/cliente-form/cliente-form.component';

export const routes: Routes = [
  // Rotas principais
  { path: '', redirectTo: '/pedidos', pathMatch: 'full' },
  { path: 'pedidos', component: PedidoListComponent },
  { path: 'pedidos/novo', component: PedidoCreateComponent },
  { path: 'pedidos/editar/:id', component: PedidoCreateComponent }, 
  
  // Rotas de Clientes
  { path: 'clientes', component: ClienteListComponent },
  { path: 'clientes/novo', component: ClienteFormComponent },
  { path: 'clientes/editar/:id', component: ClienteFormComponent },
];