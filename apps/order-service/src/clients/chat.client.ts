import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { getServiceHttpUrl } from '@workspace/contracts';

@Injectable()
export class ChatClient {
  private readonly baseUrl = getServiceHttpUrl('chat');
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
