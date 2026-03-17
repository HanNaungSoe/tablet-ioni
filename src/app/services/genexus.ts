import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';

export interface DeviceLoginResponse {
  isAllowed: boolean;
  redirectUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GenexusService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) { }

  sendData(id: string, name: string) {
    console.log('Sending data to Genexus API:', { id, name });

    // Body parameters (matching Postman test)
    // const body = {
    //   deviceId: id,
    //   manufacturer: name,
    // };

    // // Query parameters (matching GeneXus log pattern &P_...)
    // const params = {
    //   deviceId: id,
    //   manufacturer: name,
    //   P_deviceId: id,        // Also include P_ version for safety
    //   P_manufacturer: name,
    // };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Manufacturer': name,
      'DeviceId': id,
    });

    return this.http.post<DeviceLoginResponse>(this.apiUrl,  { headers });
  }
}
