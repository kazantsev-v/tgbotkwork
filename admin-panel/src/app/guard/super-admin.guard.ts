import { CanActivateFn } from '@angular/router';
import { config } from '../config/config';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';
import { map, switchMap, tap } from 'rxjs';

export const superAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService); // Получаем инстанс AuthService
  const router = inject(Router); // Получаем инстанс Router
  return authService.isAuthenticated().pipe(
    switchMap((isLoggedIn) => {
      if (!isLoggedIn) {
        router.navigate(['/login']); // Перенаправляем на страницу логина, если не авторизован
        return [false];
      }

      const currentUserTelegramId = authService.getCurrentUserTelegramId();
      if (
        currentUserTelegramId && 
        config.superAdminTelegramId && 
        currentUserTelegramId !== Number(config.superAdminTelegramId)) {
          router.navigate(['/not-authorized']); // Перенаправляем на страницу отказа в доступе
          return [false];
      }

      // Если все проверки пройдены, разрешаем доступ
      return [true];
    })
  );
};
