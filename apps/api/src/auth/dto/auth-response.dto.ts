export class AuthResponseDto {
  accessToken: string;
  user: {
    id: number;
    telegramId: string;
    firstName: string;
    lastName?: string;
    username?: string;
    role: string;
  };
}






