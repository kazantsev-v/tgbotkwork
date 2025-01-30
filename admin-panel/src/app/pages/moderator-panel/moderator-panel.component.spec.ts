import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModeratorPanelComponent } from './moderator-panel.component';

describe('ModeratorPanelComponent', () => {
  let component: ModeratorPanelComponent;
  let fixture: ComponentFixture<ModeratorPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModeratorPanelComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ModeratorPanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
