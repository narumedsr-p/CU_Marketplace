import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChatClient {
  private readonly baseUrl = process.env.CHAT_SERVICE_URL || 'http://localhost:3003';
  private readonly headers = { 'x-internal-key': process.env.INTERNAL_SERVICE_SECRET };

  constructor(private readonly httpService: HttpService) {}

  async createRoom(payload: any) {
    const { data } = await firstValueFrom(
      this.httpService.post(`${this.baseUrl}/rooms`, payload, {
        headers: this.headers,
        timeout: 5000,
      }),
    );
    return data;
  }
}
