import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

interface AuthAnswer
{
  message:string;
  token:string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = environment.backendURL + '/api/users';
  private isLoggedIn$ = new BehaviorSubject<boolean>(false);
  private token: string | null = null;
  private telegramId: number | null = null;

  constructor(private http: HttpClient) {
    this.restoreSession();
  }

  login(telegramId: number, password: string): Observable<AuthAnswer> {
    return this.http.post<AuthAnswer>(`${this.baseUrl}/moderators/login`, { telegramId, password }).pipe(
      tap((value) => {
        this.token = value.token;
        if(this.token) {
          localStorage.setItem('auth_token', this.token);
          this.telegramId = telegramId;
          localStorage.setItem('telegram_id', this.telegramId.toString());
        }
        this.isLoggedIn$.next(true);
      })
    );
  }

  getCurrentUserTelegramId(): number | null {
    return this.telegramId;
  }

  isAuthenticated(): Observable<boolean> {
    return this.isLoggedIn$.asObservable();
  }

  logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('telegram_id');
    this.isLoggedIn$.next(false);
  }

  private restoreSession(): void {
    const token = localStorage.getItem('auth_token');
    const telegram_id = localStorage.getItem('telegram_id');
    if (token) {
      this.token = token;
      this.isLoggedIn$.next(true);
    } else {
      this.isLoggedIn$.next(false);
    }
    if (telegram_id) {
      this.telegramId = Number(telegram_id);
    }
  }
}
