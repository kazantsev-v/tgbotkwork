import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    MatFormFieldModule,
    FormsModule,
    MatInputModule,
    MatButtonModule
  ],
  providers: [AuthService],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  telegramId!: number;
  password!: string;
  error = '';

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    this.authService.login(this.telegramId, this.password).subscribe({
      next: () => {
        console.log('navigating to /users')
        this.router.navigate(['/users']);
      },
      error: () => {
        this.error = 'Неверный Telegram ID или пароль.';
      },
    });
  }
}
