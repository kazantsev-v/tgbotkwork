import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task, TaskPhoto } from '../models/task';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private baseUrl = environment.backendURL + '/api/tasks';

  constructor(private http: HttpClient) {}

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.baseUrl}/`);
  }

  getPhotosByTaskId(taskId: number): Observable<TaskPhoto[]> {
    return this.http.get<TaskPhoto[]>(`${this.baseUrl}/${taskId}/photos`);
  }
  
  deleteTask(taskId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${taskId}`);
  }  

  updateTaskStatus(taskId: number, newStatus: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${taskId}/status`, { status: newStatus });
  }
}
