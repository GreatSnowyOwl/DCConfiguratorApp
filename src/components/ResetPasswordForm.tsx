import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom'; 
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

interface FormErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export default function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extract key and login from URL query parameters
  const resetKey = searchParams.get('key');
  const userLogin = searchParams.get('login');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isValidLink, setIsValidLink] = useState<boolean>(false);

  // Validate presence of key and login on mount
  useEffect(() => {
    if (!resetKey || !userLogin) {
      setFormErrors({ general: 'Invalid or incomplete password reset link.' });
      setIsValidLink(false);
    } else {
      setIsValidLink(true);
    }
  }, [resetKey, userLogin]);

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    if (!password) {
        errors.password = 'Новый пароль обязателен';
        isValid = false;
    } else if (password.length < 8) {
        errors.password = 'Пароль должен быть не менее 8 символов';
        isValid = false;
    }

    if (!confirmPassword) {
        errors.confirmPassword = 'Подтверждение пароля обязательно';
        isValid = false;
    } else if (password && password !== confirmPassword) {
        errors.confirmPassword = 'Пароли не совпадают';
        isValid = false;
    }
    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidLink || !validateForm()) {
      return;
    }

    setIsLoading(true);
    setFormErrors({});
    setMessage(null);

    try {
      const response = await fetch('/wp-json/partner-zone/v1/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          key: resetKey, 
          login: userLogin, 
          password: password 
        }),
      });

       const responseText = await response.text(); // Read text first

      if (!response.ok) {
        let errorMessage = 'Failed to reset password.';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.error("Could not parse error response:", responseText);
        }
        throw new Error(errorMessage);
      }

      // If response.ok, parse the expected JSON
      const responseData = JSON.parse(responseText);
      setMessage(responseData.message || 'Password reset successfully!');
       // Optionally clear form or redirect after a delay
       setTimeout(() => {
        navigate('/login');
      }, 3000); // Redirect to login after 3 seconds

    } catch (apiError: any) {
      console.error("Reset Password API Error:", apiError);
      setFormErrors({ general: apiError.message || "Could not reset password. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

   // Helper to display field errors
  const FieldError = ({ field }: { field: keyof FormErrors }) => {
    if (!formErrors[field]) return null;
    return <p className="text-xs text-red-400 mt-1">{formErrors[field]}</p>;
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
          <CardTitle className="text-3xl font-bold">Установить новый пароль</CardTitle>
          {!isValidLink && !message && (
            <CardDescription className="text-red-400 !mt-4">
              {formErrors.general || 'Ссылка для сброса пароля недействительна или неполна.'}
            </CardDescription>
          )}
           {message && (
             <CardDescription className="text-green-400 !mt-4">
              {message}
            </CardDescription>
          )}
        </CardHeader>
        {isValidLink && !message && (
          <form onSubmit={handleSubmit}> {/* Use form element */} 
             <CardContent className="space-y-4">
                <div className="space-y-1">
                    <Label htmlFor="password" className="text-base font-medium text-white/90">Новый пароль</Label>
                    <Input 
                      id="password" 
                      name="password" 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder="Минимум 8 символов"
                      required 
                      className={`bg-white/10 border-white/20 placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] h-11 px-4 text-base ${formErrors.password ? 'border-red-500' : ''}`} 
                     />
                    <FieldError field="password" />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="confirmPassword" className="text-base font-medium text-white/90">Подтвердите пароль</Label>
                    <Input 
                      id="confirmPassword" 
                      name="confirmPassword" 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      placeholder="Повторите новый пароль" 
                      required 
                      className={`bg-white/10 border-white/20 placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] h-11 px-4 text-base ${formErrors.confirmPassword ? 'border-red-500' : ''}`} 
                    />
                    <FieldError field="confirmPassword" />
                </div>
                {formErrors.general && (
                  <p className="text-sm text-red-500 text-center font-medium pt-2">{formErrors.general}</p>
                )}
            </CardContent>
             <CardFooter className="flex flex-col space-y-4 mt-4">
               <Button
                  type="submit"
                  className="w-full bg-[#1e88e5]/90 hover:bg-[#1e88e5] text-white h-12 text-base font-semibold rounded-lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Сохранение...' : 'Установить пароль'}
                </Button>
                <p className="text-center text-base text-white/70">
                    <Link to="/login" className="font-medium text-[#8AB73A] hover:underline">
                    Вернуться ко входу
                    </Link>
                </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
} 