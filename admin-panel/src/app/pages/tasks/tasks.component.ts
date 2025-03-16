import { Component, OnInit } from '@angular/core';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { PhotoModalComponent } from './photo-modal/photo-modal.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-tasks',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  providers: [TaskService],
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss'
})
export class TasksComponent implements OnInit {
  tasks: Task[] = [];
  displayedColumns: string[] = [
    'id', 
    'title',
    'creator', 
    'executor', 
    'description',
    'location', 
    'payment', 
    'options',
    'status', 
    'photo',
    'actions'
  ];
  constructor(private taskService: TaskService, public dialog: MatDialog, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.taskService.getTasks().subscribe((data) => {
      this.tasks = data;
    });
  }

  openPhotoDialog(taskId: number) {
    this.taskService.getPhotosByTaskId(taskId).subscribe((photos) => {
      this.dialog.open(PhotoModalComponent, {
        width: '600px',
        data: { photos },
      });
    });
  }

  deleteTask(taskId: number): void {
    this.taskService.deleteTask(taskId).subscribe({
      next: () => {
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        this.snackBar.open(`Задача ${taskId} удалена`, 'Закрыть', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(`Ошибка: не удалось удалить задачу`, 'Закрыть', { duration: 3000 });
        console.error(`Ошибка при удалении задачи ${taskId}:`, err);
      },
    });
  }
  

  approveTask(taskId: number) {
    const newStatus = 'approved';
    this.taskService.updateTaskStatus(taskId, newStatus).subscribe({
      next: () => {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
          task.status = newStatus;
        }
        this.snackBar.open(`Задача ${taskId} утверждена`, 'Закрыть', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(`Ошибка: не удалось утвердить задачу`, 'Закрыть', { duration: 3000 });
        console.error(`Ошибка при обновлении задачи ${taskId}:`, err);
      },
    });
  }

  cancelApproveTask(taskId: number) {
    const newStatus = 'pending';
    this.taskService.updateTaskStatus(taskId, newStatus).subscribe({
      next: () => {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
          task.status = newStatus;
        }
        this.snackBar.open(`Утверждение задачи ${taskId} отменено`, 'Закрыть', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(`Ошибка: не удалось отменить утверждение задачи`, 'Закрыть', { duration: 3000 });
        console.error(`Ошибка при обновлении задачи ${taskId}:`, err);
      },
    });
  }
}