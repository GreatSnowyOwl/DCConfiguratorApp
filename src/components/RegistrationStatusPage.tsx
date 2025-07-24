import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Import background and logo
import backgroundImage from '/DATACENTER.png'; // Assuming same background
import logoImage from '/logologo.png'; // Assuming same logo

export default function RegistrationStatusPage() {
  const [searchParams] = useSearchParams();
  const state = searchParams.get('state');
  const email = searchParams.get('email'); // Get email if passed

  let title = 'Статус регистрации';
  let message = 'Произошла неизвестная ошибка.'; // Default error message
  let description = 'Пожалуйста, попробуйте еще раз или обратитесь в поддержку.';

  switch (state) {
    case 'check_email':
      title = 'Регистрация почти завершена!';
      message = `Мы отправили ссылку для подтверждения на ваш email: ${email || 'your email'}.`;
      description = 'Пожалуйста, проверьте свою почту (включая папку спам) и перейдите по ссылке для завершения регистрации.';
      break;
    case 'pending_approval':
      title = 'Email подтвержден!';
      message = 'Ваш email успешно подтвержден.';
      description = 'Ваша учетная запись ожидает одобрения менеджером. Мы сообщим вам, как только она будет активирована.';
      break;
    case 'already_verified':
      title = 'Email уже подтвержден';
      message = 'Этот email адрес уже был подтвержден ранее.';
      description = 'Ваша учетная запись все еще ожидает одобрения менеджером.';
      break;
    case 'verification_error_user':
    case 'verification_error_token':
    case 'verification_error_expired':
      title = 'Ошибка подтверждения Email';
      message = 'Не удалось подтвердить ваш email.';
      description = 'Ссылка для подтверждения недействительна или срок ее действия истек. Пожалуйста, попробуйте зарегистрироваться снова или обратитесь в поддержку.';
      break;
    // Add more cases if needed
  }

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relative flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundColor: '#0A2B6C', // Fallback color
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[#0A2B6C] bg-opacity-40 z-0"></div>
      <img
        src={logoImage}
        alt="Logo"
        className="absolute top-6 right-6 h-10 md:h-12 z-10"
      />
      <Card className="w-full max-w-md z-10 bg-[#0A2B6C]/20 backdrop-blur-lg border border-white/10 text-white p-6 rounded-2xl shadow-xl text-center">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl font-bold">{title}</CardTitle>
          <CardDescription className="text-white/80 pt-2">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-white/70">
            {description}
          </p>
        </CardContent>
        <CardFooter className="flex justify-center mt-6">
          <Link to="/login">
            <Button 
              variant="outline"
              className="bg-transparent border-white/50 hover:bg-white/10 text-white h-11 rounded-lg text-base font-medium px-6"
            >
              Перейти ко входу
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
} 