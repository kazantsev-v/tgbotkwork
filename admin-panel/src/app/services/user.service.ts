import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User, Customer, Moderator, Worker } from '../models/user';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = environment.backendURL + '/api/users';

  constructor(private http: HttpClient) { }

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/`);
  }

  getCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.baseUrl}/customer`);
  }

  getWorkers(): Observable<Worker[]> {
    return this.http.get<Worker[]>(`${this.baseUrl}/worker`);
  }

  getModerators(): Observable<Moderator[]> {
    return this.http.get<Moderator[]>(`${this.baseUrl}/moderator`);
  }

  getWorkerStatistic(telegramId: number): Observable<{
    balance: number,
    income: number,
    completedTasks: number,
    rating: number,
  }> {
    return this.http.get<{
      balance: number,
      income: number,
      completedTasks: number,
      rating: number,
    }>(`${this.baseUrl}/worker/${telegramId}/stats`);
  }
}
