import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // Use Link for navigation
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Import background and logo
import backgroundImage from '/DATACENTER.png';
import logoImage from '/logologo.png';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        setError('Пожалуйста, введите корректный email адрес.');
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch('/wp-json/partner-zone/v1/request-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Use message from backend error response if available
        throw new Error(responseData.message || 'Failed to send reset request.');
      }

      // Display success message from backend
      setMessage(responseData.message || 'Password reset link sent if email exists.');

    } catch (apiError: any) {
      console.error("Forgot Password API Error:", apiError);
      setError(apiError.message || "Could not send request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relative flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundColor: '#0A2B6C',
        backgroundSize: 'cover',
      }}
    >
      <div className="absolute inset-0 bg-[#0A2B6C] bg-opacity-40 z-0"></div>
      <img
        src={logoImage}
        alt="Logo"
        className="absolute top-6 right-6 h-10 md:h-12 z-10"
      />
      <Card className="w-full max-w-md z-10 bg-[#0A2B6C]/20 backdrop-blur-lg border border-white/10 text-white p-6 rounded-2xl shadow-xl">
        <CardHeader className="space-y-2 text-center mb-4">
          <CardTitle className="text-3xl font-bold">Восстановить пароль</CardTitle>
          <CardDescription className="text-white/70">
            Введите email вашего аккаунта для получения ссылки на сброс пароля.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {message && (
            <p className="text-sm text-green-400 text-center font-medium">{message}</p>
          )}
          {error && (
            <p className="text-sm text-red-500 text-center font-medium">{error}</p>
          )}
          {!message && ( // Hide form after success message
             <div className="space-y-1">
               <Label htmlFor="email" className="text-base font-medium text-white/90">Email</Label>
               <Input
                 id="email"
                 name="email"
                 type="email"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 placeholder="Введите ваш email"
                 required
                 className={`bg-white/10 border-white/20 placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] h-11 px-4 text-base ${error ? 'border-red-500' : ''}`}
               />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 mt-4">
          {!message && ( // Hide button after success message
            <Button
              type="submit"
              className="w-full bg-[#1e88e5]/90 hover:bg-[#1e88e5] text-white h-12 text-base font-semibold rounded-lg"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? 'Отправка...' : 'Отправить ссылку'}
            </Button>
          )}
          <p className="text-center text-base text-white/70">
            <Link to="/login" className="font-medium text-[#8AB73A] hover:underline">
              Вернуться ко входу
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 