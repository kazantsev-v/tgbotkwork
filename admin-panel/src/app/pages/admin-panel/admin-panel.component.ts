import { Component } from '@angular/core';
import { MatButtonModule,  } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminService } from '../../services/admin.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    FormsModule
  ],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss'
})
export class AdminPanelComponent {
  telegramId: number | undefined;
  password: string = '';
  errorMessage: string = '';

  constructor(private adminService: AdminService) {}

  onRegister(): void {
    if (this.telegramId && this.password) {
      this.adminService.registerModerator(this.telegramId, this.password).subscribe({
        next: (response) => {
          // Очистить форму после успешной регистрации
          this.telegramId = undefined;
          this.password = '';
          alert('Модератор успешно зарегистрирован!');
        },
        error: (err) => {
          this.errorMessage = 'Ошибка при регистрации модератора: ' + err.message;
        },
      });
    }
  }
}
