import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';
import { throwError, catchError, switchMap, BehaviorSubject, filter, take, Observable } from 'rxjs';

let isRefreshing = false;
let refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.accessToken();

  // Dynamically resolve base URL using environment file
  let url = req.url;
  const baseUrl = environment.apiBaseUrl || '/api';

  if (url.startsWith('/api/')) {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    url = `${cleanBase}${url.substring(4)}`; // replace '/api' with clean baseUrl
  } else if (!url.startsWith('http') && !url.startsWith('/')) {
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    url = `${cleanBase}/${url}`;
  }

  let clonedReq = req.clone({ url });

  if (token && !clonedReq.url.includes('/auth/refresh')) {
    clonedReq = clonedReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  if (clonedReq.url.includes('/auth/')) {
    clonedReq = clonedReq.clone({
      withCredentials: true
    });
  }

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('[API Error]:', error.url, error.status, error.message, error.error);
      if (error.status === 401 && !clonedReq.url.includes('/auth/login') && !clonedReq.url.includes('/auth/refresh') && !clonedReq.url.includes('/auth/logout')) {
        return handle401Error(clonedReq, next, authService);
      }
      return throwError(() => error);
    })
  );
};

function handle401Error(request: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthService): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((res: any) => {
        isRefreshing = false;
        refreshTokenSubject.next(res.accessToken);
        const newRequest = request.clone({
          setHeaders: {
            Authorization: `Bearer ${res.accessToken}`
          }
        });
        return next(newRequest);
      }),
      catchError((err) => {
        isRefreshing = false;
        authService.logout();
        return throwError(() => err);
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(jwt => {
        return next(request.clone({
          setHeaders: {
            Authorization: `Bearer ${jwt}`
          }
        }));
      })
    );
  }
}
