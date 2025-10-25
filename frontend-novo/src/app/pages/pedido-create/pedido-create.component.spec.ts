import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PedidoCreateComponent } from './pedido-create.component';

describe('PedidoCreateComponent', () => {
  let component: PedidoCreateComponent;
  let fixture: ComponentFixture<PedidoCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PedidoCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PedidoCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
