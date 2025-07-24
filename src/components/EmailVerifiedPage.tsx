import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Import background and logo
import backgroundImage from '/DATACENTER.png'; // Assuming same background
import logoImage from '/logologo.png'; // Assuming same logo

export default function EmailVerifiedPage() {
  const title = 'Email Подтвержден!';
  const message = 'Ваш email успешно подтвержден.';
  const description = 'Ваша учетная запись теперь ожидает одобрения менеджером.';

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