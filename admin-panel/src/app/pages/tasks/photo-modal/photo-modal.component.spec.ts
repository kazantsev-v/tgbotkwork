import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhotoModalComponent } from './photo-modal.component';

describe('PhotoModalComponent', () => {
  let component: PhotoModalComponent;
  let fixture: ComponentFixture<PhotoModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhotoModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PhotoModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
