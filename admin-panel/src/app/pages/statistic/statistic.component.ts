import { Component, OnInit } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { UserService } from '../../services/user.service';
import { Worker } from '../../models/user';
import { ChangeDetectorRef } from '@angular/core';
import { forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-statistic',
  standalone: true,
  imports: [MatTableModule],
  templateUrl: './statistic.component.html',
  styleUrl: './statistic.component.scss'
})
export class StatisticComponent implements OnInit {
  displayedColumns: string[] = ['telegramId', 'balance', 'income', 'completedTasks', 'rating'];
  workerStatistics: any[] = [];

  constructor(private userService: UserService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.userService.getWorkers().subscribe((workers: Worker[]) => {
      const statisticsObservables = workers.map((worker: Worker) => 
        this.userService.getWorkerStatistic(worker.user.telegramId).pipe(
          map(statistic => ({
            telegramId: worker.user.telegramId,
            ...statistic
          }))
        )
      );

      forkJoin(statisticsObservables).subscribe(statistics => {
        this.workerStatistics = statistics;
        this.cdr.detectChanges(); // Trigger change detection
      });
    });
  }
}
