import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
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

// Import useAuth hook
import { useAuth } from '../contexts/AuthContext'; // Double-check this relative path is correct

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Get login function from context and navigate
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/wp-json/partner-zone/v1/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: email, password }),
      });

      // Check if the response is successful before trying to parse JSON
      // WordPress might send non-JSON on errors sometimes
      const responseText = await response.text(); // Get text first

      if (!response.ok) {
        // Try parsing error JSON, but fallback if it's not JSON
        let errorMessage = 'Login failed. Please check your credentials.';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          // If parsing fails, the response likely wasn't JSON (e.g., HTML error page)
          console.error("Could not parse error response:", responseText);
        }
        throw new Error(errorMessage);
      }

      // If response.ok, *now* parse the expected JSON
      const responseData = JSON.parse(responseText);

      // Check if token and user data exist in the successful response
      if (responseData.success && responseData.data.token && responseData.data.user) {
        // Call the login function from AuthContext
        // Adjusting based on typical wp_send_json_success structure
        login(responseData.data.token, responseData.data.user);
        console.log('Login successful:', responseData.data.user);
        // Navigate to dashboard upon successful login
        navigate('/dashboard');
      } else {
        // Handle unexpected successful response format
        console.error("Unexpected successful response format:", responseData);
        throw new Error('Login failed: Invalid response format from server.');
      }

    } catch (apiError: any) {
      console.error("Login API Error:", apiError);
      setError(apiError.message || "Login failed. Please try again.");
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
          <CardTitle className="text-3xl font-bold">Вход</CardTitle>
          <CardDescription className="text-white/70">
            Войдите в свою учетную запись партнера.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
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
          <div className="space-y-1">
            <Label htmlFor="password" className="text-base font-medium text-white/90">Пароль</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите пароль"
              required
              className={`bg-white/10 border-white/20 placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] h-11 px-4 text-base ${error ? 'border-red-500' : ''}`}
            />
          </div>
          <div className="text-center pt-1">
            <Link 
              to="/forgot-password"
              className="text-sm font-medium text-[#8AB73A] hover:underline"
            >
              Забыли пароль?
            </Link>
          </div>
          {error && (
            <p className="text-sm text-red-500 text-center font-medium pt-2">{error}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 mt-4">
          <Button
            type="submit"
            className="w-full bg-[#1e88e5]/90 hover:bg-[#1e88e5] text-white h-12 text-base font-semibold rounded-lg"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Вход...' : 'Войти'}
          </Button>
          <p className="text-center text-base text-white/70">
            Нет аккаунта?{' '}
            <Link to="/signup" className="font-medium text-[#8AB73A] hover:underline">
              Получить учетную запись
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 