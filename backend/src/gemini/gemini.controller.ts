import { Controller, Sse, MessageEvent, Query } from '@nestjs/common';
import { GeminiService } from './gemini.service';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Controller('gemini')
export class GeminiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Sse('stream')
  stream(@Query('prompt') prompt: string): Observable<MessageEvent> {
    return from(this.geminiService.streamText(prompt)).pipe(
      map((text) => ({ data: { text } } as MessageEvent)),
    );
  }
}
