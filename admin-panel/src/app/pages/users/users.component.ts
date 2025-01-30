import { Component, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { User, Customer, Moderator, Worker, Role } from '../../models/user';
import { UserService } from '../../services/user.service';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    MatTableModule,
    HttpClientModule
  ],
  providers: [UserService],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss'
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  customers: Customer[] = [];
  workers: Worker[] = [];
  moderators: Moderator[] = [];
  roles: Role[] = [
    { name: 'Заказчик', internal: 'customer' },
    { name: 'Рабочий', internal: 'worker' },
    { name: 'Грузчик', internal: 'loader' },
    { name: 'Такелажник', internal: 'rigger' },
    { name: 'Разнорабочий', internal: 'handyman' },
    { name: 'Водитель', internal: 'driver' },
    { name: 'Демонтажник', internal: 'dismantler' },
    { name: 'Модератор', internal: 'moderator' }
  ];


  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadCustomers();
    this.loadWorkers();
    this.loadModerators();
  }

  private loadUsers(): void {
    this.userService.getUsers().subscribe((data) => {
      this.users = data;
    });
  }

  private loadCustomers(): void {
    this.userService.getCustomers().subscribe((data) => {
      this.customers = data;
    });
  }

  private loadWorkers(): void {
    this.userService.getWorkers().subscribe((data: any) => {
      this.workers = data || [];
    });
  }

  private loadModerators(): void {
    this.userService.getModerators().subscribe((data) => {
      this.moderators = data;
    });
  }

  protected prettyRole(internal: string): string {
    return this.roles.find(r => r.internal === internal)?.name || internal;
  }

  protected getWorker(userId: number): Worker | null {
    return this.workers.find(w => w.user.id === userId) || null;
  }

  columns: string[] = ['id', 'telegramId', 'name', 'role', 'photo', 'phone', 'balance', 'weeklyIncome', 'rating'];
}
