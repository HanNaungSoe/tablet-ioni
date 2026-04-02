import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { HTTP, type HTTPResponse } from '@awesome-cordova-plugins/http/ngx';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  status: string;
  message: string;
}

export interface LoginSession {
  username: string;
  loggedInAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private readonly storageKey = 'tablet-login-session';
  private readonly absoluteLoginUrl = this.resolveAbsoluteLoginUrl();
  private nativeTrustConfigured = false;
  private readonly sessionSubject = new BehaviorSubject<LoginSession | null>(this.readSession());

  readonly session$ = this.sessionSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly nativeHttp: HTTP
  ) {}

  get session(): LoginSession | null {
    return this.sessionSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.session?.username?.trim();
  }

  login(credentials: LoginCredentials): Observable<LoginResponse> {
    const username = credentials.username.trim();
    const password = credentials.password;
    const params = this.buildParams(username, password);

    if (Capacitor.isNativePlatform()) {
      return from(this.loginNative(params, username));
    }

    return this.http
      .post<LoginResponse>(this.getWebLoginUrl(), null, { params })
      .pipe(tap((response) => this.handleLoginResponse(response, username)));
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.sessionSubject.next(null);
  }

  private async loginNative(params: HttpParams, username: string): Promise<LoginResponse> {
    if (environment.insecureSsl && !this.nativeTrustConfigured) {
      await this.nativeHttp.setServerTrustMode('nocheck');
      this.nativeTrustConfigured = true;
    }

    const nativeLoginUrl = this.buildNativeLoginUrl(params);
    const response: HTTPResponse = await this.nativeHttp.sendRequest(nativeLoginUrl, {
      method: 'get',
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
      responseType: 'json',
    });

    const parsedResponse = this.normalizeLoginResponse(response.data);
    this.handleLoginResponse(parsedResponse, username);
    return parsedResponse;
  }

  private handleLoginResponse(response: LoginResponse | null | undefined, username: string): void {
    if (response?.status !== 'success') {
      this.logout();
      return;
    }

    const session: LoginSession = {
      username,
      loggedInAt: new Date().toISOString(),
    };

    localStorage.setItem(this.storageKey, JSON.stringify(session));
    this.sessionSubject.next(session);
  }

  private buildParams(username: string, password: string): HttpParams {
    return new HttpParams()
      .set('userid', username)
      .set('password', password);
  }

  private getWebLoginUrl(): string {
    const configured = environment.loginApiUrl?.trim();
    if (configured) {
      return configured;
    }

    return this.getFallbackLoginUrl(environment.apiUrl);
  }

  private resolveAbsoluteLoginUrl(): string {
    const configured = environment.loginApiUrl?.trim();
    if (!configured) {
      return this.getFallbackLoginUrl(environment.websiteUrl);
    }

    if (/^https?:\/\//i.test(configured)) {
      return configured;
    }

    const origin = new URL(environment.websiteUrl).origin;
    return `${origin}${configured.startsWith('/') ? configured : `/${configured}`}`;
  }

  private getFallbackLoginUrl(url: string): string {
    return url.replace(/adevice_login$/i, 'alogin_api');
  }

  private buildNativeLoginUrl(params: HttpParams): string {
    const queryString = params.toString();
    if (!queryString) {
      return this.absoluteLoginUrl;
    }

    const connector = this.absoluteLoginUrl.includes('?') ? '&' : '?';
    return `${this.absoluteLoginUrl}${connector}${queryString}`;
  }

  private normalizeLoginResponse(responseData: unknown): LoginResponse {
    if (typeof responseData === 'string') {
      return JSON.parse(responseData) as LoginResponse;
    }

    return responseData as LoginResponse;
  }

  private readSession(): LoginSession | null {
    const rawValue = localStorage.getItem(this.storageKey);
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as LoginSession;
    } catch (error) {
      console.warn('Failed to parse saved login session', error);
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }
}
