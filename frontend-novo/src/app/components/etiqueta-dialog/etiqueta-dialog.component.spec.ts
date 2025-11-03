import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EtiquetaDialogComponent } from './etiqueta-dialog.component';

describe('EtiquetaDialogComponent', () => {
  let component: EtiquetaDialogComponent;
  let fixture: ComponentFixture<EtiquetaDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EtiquetaDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EtiquetaDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
