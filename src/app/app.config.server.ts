import {ApplicationConfig, mergeApplicationConfig} from '@angular/core';
import {provideServerRendering, withRoutes} from '@angular/ssr';
import {HttpInterceptorFn, provideHttpClient, withInterceptors, withFetch} from '@angular/common/http';
import {appConfig} from './app.config';
import {serverRoutes} from './app.routes.server';

const serverInterceptor: HttpInterceptorFn = (req, next) => {
  // If the request points to our API, reroute it to localhost to bypass network loopback issues in SSR container
  let url = req.url;
  const isContainer = typeof process !== 'undefined' && process.env && (process.env['PORT'] || process.env['K_SERVICE']);
  if (isContainer && (url.startsWith('/api/') || url.includes('.run.app'))) {
    const port = process.env['PORT'] || 3000;
    const path = url.startsWith('/') ? url : new URL(url).pathname;
    url = `http://localhost:${port}${path}`;
    const newReq = req.clone({ url });
    return next(newReq);
  }
  return next(req);
};

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideHttpClient(withFetch(), withInterceptors([serverInterceptor]))
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
