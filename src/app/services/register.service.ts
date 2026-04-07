import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { HTTP, type HTTPResponse } from '@awesome-cordova-plugins/http/ngx';
import { firstValueFrom } from 'rxjs';
import { environment } from 'src/environments/environment';
import { DeviceService } from './device';

const REGISTER_SUCCESS_MESSAGE = '\u30ea\u30af\u30a8\u30b9\u30c8\u304c\u6b63\u5e38\u306b\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002';
const REGISTER_FAIL_MESSAGE = '\u7533\u8acb\u4f9d\u983c\u6e08\u306e\u30c7\u30d0\u30a4\u30b9\u3067\u3059\u3002\u3057\u3070\u3089\u304f\u304a\u5f85\u3061\u304f\u3060\u3055\u3044\u3002';

export interface RegistrationRecord {
  userId: string;
  deviceId: string;
  manufacturer: string;
  registeredAt: string;
}

export interface RegistrationDraft {
  userId: string;
  deviceId: string;
  manufacturer: string;
}

export interface RegisterApiResponse {
  status?: string;
  message?: string;
  rawBody?: string;
  [key: string]: unknown;
}

export interface RegistrationResult {
  record: RegistrationRecord;
  response: RegisterApiResponse;
}

@Injectable({
  providedIn: 'root',
})
export class RegisterService {
  private readonly storageKey = 'tablet-registration';
  private readonly absoluteRegisterUrl = this.resolveAbsoluteRegisterUrl();
  private nativeTrustConfigured = false;

  constructor(
    private readonly deviceService: DeviceService,
    private readonly http: HttpClient,
    private readonly nativeHttp: HTTP
  ) {}

  async getDraft(): Promise<RegistrationDraft> {
    const saved = this.getRegistration();

    let deviceId = saved?.deviceId ?? 'Unknown';
    let manufacturer = saved?.manufacturer ?? 'Unknown';

    try {
      deviceId = await this.deviceService.getDeviceId();
    } catch (error) {
      console.warn('Failed to load device ID for registration', error);
    }

    try {
      const deviceInfo = await this.deviceService.getDeviceInfo();
      manufacturer = deviceInfo.manufacturer ?? manufacturer;
    } catch (error) {
      console.warn('Failed to load device manufacturer for registration', error);
    }

    return {
      userId: saved?.userId ?? '',
      deviceId,
      manufacturer,
    };
  }

  getRegistration(): RegistrationRecord | null {
    const rawValue = localStorage.getItem(this.storageKey);
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as RegistrationRecord;
    } catch (error) {
      console.warn('Failed to parse saved registration', error);
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  hasRegistration(): boolean {
    return !!this.getRegistration()?.userId?.trim();
  }

  async register(userId: string): Promise<RegistrationResult> {
    const draft = await this.getDraft();
    const normalizedUserId = userId.trim();

    // Only persist locally after the backend accepts the request.
    await this.submitRegistration(normalizedUserId, draft.deviceId, draft.manufacturer);

    const record: RegistrationRecord = {
      userId: normalizedUserId,
      deviceId: draft.deviceId,
      manufacturer: draft.manufacturer,
      registeredAt: new Date().toISOString(),
    };

    localStorage.setItem(this.storageKey, JSON.stringify(record));

    return {
      record,
      response: {
        status: 'success',
        message: REGISTER_SUCCESS_MESSAGE,
      },
    };
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
  }

  private async submitRegistration(
    userId: string,
    deviceId: string,
    deviceName: string
  ): Promise<void> {
    const params = this.buildRegisterParams(userId, deviceId, deviceName);

    if (Capacitor.isNativePlatform()) {
      const response = await this.registerNative(params);
      this.ensureSuccessfulResponse(response);
      return;
    }

    const response = await firstValueFrom(
      this.http.get(this.getWebRegisterUrl(), {
        params,
        responseType: 'text',
      })
    );

    this.ensureSuccessfulResponse(this.normalizeRegisterResponse(response));
  }

  private buildRegisterParams(userId: string, deviceId: string, deviceName: string): HttpParams {
    return new HttpParams()
      .set('device_id', deviceId.trim())
      .set('device_name', deviceName.trim() || 'Unknown')
      .set('user_id', userId);
  }

  private getWebRegisterUrl(): string {
    return environment.registerApiUrl?.trim() || this.absoluteRegisterUrl;
  }

  private resolveAbsoluteRegisterUrl(): string {
    const configured = environment.registerApiUrl?.trim();
    if (!configured) {
      return this.getFallbackRegisterUrl(environment.websiteUrl);
    }

    if (/^https?:\/\//i.test(configured)) {
      return configured;
    }

    const origin = new URL(environment.websiteUrl).origin;
    return `${origin}${configured.startsWith('/') ? configured : `/${configured}`}`;
  }

  private getFallbackRegisterUrl(url: string): string {
    return url.replace(/adevice_login$/i, 'at127_devicerequest_api');
  }

  private async registerNative(params: HttpParams): Promise<RegisterApiResponse> {
    if (environment.insecureSsl && !this.nativeTrustConfigured) {
      await this.nativeHttp.setServerTrustMode('nocheck');
      this.nativeTrustConfigured = true;
    }

    const url = this.buildNativeRegisterUrl(params);
    const response: HTTPResponse = await this.nativeHttp.sendRequest(url, {
      method: 'get',
      headers: {
        Accept: 'application/json, text/plain, */*',
      },
      responseType: 'text',
    });

    return this.normalizeRegisterResponse(response.data);
  }

  private buildNativeRegisterUrl(params: HttpParams): string {
    const queryString = params.toString();
    if (!queryString) {
      return this.absoluteRegisterUrl;
    }

    const connector = this.absoluteRegisterUrl.includes('?') ? '&' : '?';
    return `${this.absoluteRegisterUrl}${connector}${queryString}`;
  }

  private normalizeRegisterResponse(responseData: unknown): RegisterApiResponse {
    if (typeof responseData === 'string') {
      const trimmed = responseData.trim();
      if (!trimmed) {
        return {};
      }

      // GeneXus returns HTML when the request succeeds.
      if (this.isHtmlDocument(trimmed)) {
        return {
          status: 'success',
          message: REGISTER_SUCCESS_MESSAGE,
          rawBody: trimmed,
        };
      }

      const failMatch = trimmed.match(/"status"\s*:\s*"([^"]+)"/i);
      return {
        status: failMatch?.[1]?.trim(),
        rawBody: trimmed,
      };
    }

    return {
      status: typeof responseData === 'object' && responseData && 'status' in (responseData as Record<string, unknown>)
        ? String((responseData as Record<string, unknown>)['status'])
        : undefined,
      rawBody: typeof responseData === 'string' ? responseData : undefined,
    };
  }

  private ensureSuccessfulResponse(response: RegisterApiResponse): void {
    const status = response.status?.trim().toLowerCase();

    if (status === 'fail') {
      throw new Error(REGISTER_FAIL_MESSAGE);
    }
  }

  private isHtmlDocument(value: string): boolean {
    return /^<!doctype html/i.test(value)
      || /^<html[\s>]/i.test(value)
      || /<body[\s>]/i.test(value);
  }
}
