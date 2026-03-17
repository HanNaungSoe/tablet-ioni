import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { HTTP, type HTTPResponse } from '@awesome-cordova-plugins/http/ngx';
import { environment } from 'src/environments/environment';
import { from, Observable } from 'rxjs';

export interface DeviceLoginResponse {
  isAllowed: boolean;
  redirectUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GenexusService {
  private readonly websiteUrl = environment.websiteUrl;
  private nativeTrustConfigured = false;
  private lastNativeCookieHeader: string | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly nativeHttp: HTTP
  ) { }

  sendData(id: string, name: string): Observable<DeviceLoginResponse> {
    console.log('Sending data to Genexus API:', { id, name });

    // Original hardcoded payload kept for reference:
    // const body = {
    //   deviceId: '0f952d37-8eac-4efc-b235-c02ae6571311',
    //   manufacturer: name,
    // };

    const body = {
      deviceId: id,
      manufacturer: name,

    };

    // Original hardcoded headers kept for reference:
    // const headers = new HttpHeaders({
    //   'Content-Type': 'application/json',
    //   'Manufacturer': name,
    //   'DeviceId': '0f952d37-8eac-4efc-b235-c02ae6571311',
    // });

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Manufacturer': name,
      'DeviceId': id,
    });
    //'0f952d37-8eac-4efc-b235-c02ae6571311'
    console.log('Genexus request payload:', {
      url: this.websiteUrl,
      body,
      headers: {
        Manufacturer: name,
        DeviceId: id,
      },
    });

    if (Capacitor.isNativePlatform()) {
      return from(this.sendDataNative(body, name, id));
    }

    const webUrl = environment.apiUrl?.startsWith('/')
      ? environment.apiUrl
      : this.websiteUrl;

    return this.http.post<DeviceLoginResponse>(webUrl, body, { headers });
  }

  getLastNativeCookieHeader(): string | null {
    return this.lastNativeCookieHeader;
  }

  private async sendDataNative(body: any, manufacturer: string, id: string): Promise<DeviceLoginResponse> {

    if (environment.insecureSsl && !this.nativeTrustConfigured) {
      await this.nativeHttp.setServerTrustMode('nocheck');
      this.nativeTrustConfigured = true;
    }

    this.nativeHttp.setDataSerializer('json');
    //0f952d37-8eac-4efc-b235-c02ae6571311
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Manufacturer: manufacturer,
      DeviceId: id,
      Accept: 'application/json, text/plain, */*',
    };

    const url = environment.apiUrl?.startsWith('http')
      ? environment.apiUrl
      : this.websiteUrl;

    const res: HTTPResponse = await this.nativeHttp.sendRequest(url, {
      method: 'post',
      data: body,
      headers,
      serializer: 'json',
      responseType: 'json',
    });

    try {
      const cookie = this.nativeHttp.getCookieString(url);
      this.lastNativeCookieHeader = cookie && cookie.trim().length > 0 ? cookie : null;
    } catch {
      this.lastNativeCookieHeader = null;
    }

    return res.data as DeviceLoginResponse;
  }
}
