import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment'; // Убедитесь, что путь правильный

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private baseUrl = environment.backendURL + '/api/users'; // Укажите здесь базовый URL вашего API

  constructor(private http: HttpClient) {}

  registerModerator(telegramId: number, password: string): Observable<any> {
    const payload = { telegramId, password };
    return this.http.post(`${this.baseUrl}/moderators/register`, payload); // Убедитесь, что URL правильный
  }
}
