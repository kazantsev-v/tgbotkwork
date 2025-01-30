import { Routes } from '@angular/router';
import { UsersComponent } from './pages/users/users.component';
import { TasksComponent } from './pages/tasks/tasks.component';
import { RemindersComponent } from './pages/reminders/reminders.component';
import { AdminPanelComponent } from './pages/admin-panel/admin-panel.component';
import { ModeratorPanelComponent } from './pages/moderator-panel/moderator-panel.component';
import { LoginComponent } from './pages/login/login.component';
import { authGuard } from './guard/auth.guard';
import { superAdminGuard } from './guard/super-admin.guard';
import { StatisticComponent } from './pages/statistic/statistic.component';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'users', component: UsersComponent, canActivate: [authGuard] },
    { path: 'tasks', component: TasksComponent, canActivate: [authGuard] },
    { path: 'reminders', component: RemindersComponent, canActivate: [authGuard] },
    { path: 'stats', component: StatisticComponent, canActivate: [authGuard] },
    { path: 'moderator', component: ModeratorPanelComponent, canActivate: [authGuard] },
    { path: 'admin', component: AdminPanelComponent, canActivate: [superAdminGuard] },
    { path: '', redirectTo: '/login', pathMatch: 'full' },
    { path: '**', redirectTo: '/login' },
];
