import { Injectable } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { map, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated().pipe(
    switchMap((isLoggedIn) => {
      if (!isLoggedIn) {
        router.navigate(['/login']);
        return of(false);
      }
      return of(true);
    })
  );
};
