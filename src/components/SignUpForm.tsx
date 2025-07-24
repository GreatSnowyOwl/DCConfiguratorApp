import React, { useState } from 'react';
// Add imports for routing
import { useNavigate, Link } from 'react-router-dom'; 
// Import Framer Motion
import { motion, AnimatePresence } from 'framer-motion';

// Reverting to standard alias path
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Import background image
import backgroundImage from '/DATACENTER.png';
// Import logo image
import logoImage from '/logologo.png';

// Interface for form errors
interface FormErrors {
  companyName?: string;
  contactPerson?: string;
  lastName?: string; // Add error field for last name
  email?: string;
  phone?: string;
  website?: string; // Add website error field (optional)
  password?: string;
  confirmPassword?: string;
  general?: string; // For general errors like password mismatch
}

export default function SignUpPage() {
  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat relative flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundColor: '#0A2B6C', // Fallback color
        backgroundSize: 'cover',
      }}
    >
      {/* Dark blue overlay */}
      <div className="absolute inset-0 bg-[#0A2B6C] bg-opacity-40 z-0"></div>

      {/* Logo in top-right corner */}
      <img
        src={logoImage}
        alt="Logo"
        className="absolute top-6 right-6 h-10 md:h-12 z-10"
      />

      {/* Sign Up Form Component - Centered */}
      <SignUpForm />
    </div>
  );
}


function SignUpForm() {
  const [step, setStep] = useState<1 | 2>(1);
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState(''); // State for Website (optional)
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Use specific error state object
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  // Get the navigate function
  const navigate = useNavigate(); 

  // URL Validation Regex - Allow optional scheme (http/https) or starting with www.
  const urlPattern = /^(https?:\/\/)?(www\.)?([-\w\d@:%._\+~#=]{1,256})\.([a-z]{2,6})\b([-\w\d@:%_\+.~#?&//=]*)$/i;

  // Validation Function - Now accepts step number
  const validateStep = (currentStep: 1 | 2): boolean => {
    const errors: FormErrors = {};
    let isValid = true;

    if (currentStep === 1) {
      if (!companyName.trim()) {
          errors.companyName = 'Название компании обязательно';
          isValid = false;
      }
      if (!contactPerson.trim()) {
          errors.contactPerson = 'Имя контактного лица обязательно';
          isValid = false;
      }
      if (!lastName.trim()) {
          errors.lastName = 'Фамилия обязательна';
          isValid = false;
      }
      if (!email.trim()) {
          errors.email = 'Email обязателен';
          isValid = false;
      } else if (!/\S+@\S+\.\S+/.test(email)) {
          errors.email = 'Введите корректный email адрес';
          isValid = false;
      }
      if (!phone.trim()) {
          errors.phone = 'Номер телефона обязателен';
          isValid = false;
      }
      // Make Website validation mandatory
      if (!website.trim()) {
          errors.website = 'Веб-сайт обязателен';
          isValid = false;
      } else if (!urlPattern.test(website)) {
          // Update error message
          errors.website = 'Введите корректный URL веб-сайта';
          isValid = false;
      }
    }

    if (currentStep === 2) {
      if (!password) {
          errors.password = 'Пароль обязателен';
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
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleNextStep = () => {
    if (validateStep(1)) {
      setStep(2);
    }
  };

  const handlePreviousStep = () => {
    setStep(1);
  };

  const handleFinalSubmit = async () => {
    if (!validateStep(2)) {
        return; // Stop submission if validation fails
    }

    setIsLoading(true);
    setFormErrors({}); // Clear errors before final submission

    // Prepend https:// if scheme is missing from website URL
    let formattedWebsite = website.trim();
    if (formattedWebsite && !formattedWebsite.startsWith('http://') && !formattedWebsite.startsWith('https://')) {
      formattedWebsite = `https://${formattedWebsite}`;
      console.log(`Prepended https:// to website: ${formattedWebsite}`); // Optional log
    }

    const registrationData = {
        company_name: companyName,
        first_name: contactPerson,
        last_name: lastName,
        email,
        phone_number: phone,
        website: formattedWebsite, // Use the potentially modified website URL
        password,
    };

    try {
        const response = await fetch('/wp-json/partner-zone/v1/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add Nonce header here if your WP endpoint requires it for security
                // 'X-WP-Nonce': your_wp_nonce_variable 
            },
            body: JSON.stringify(registrationData),
        });

        // --- Debugging Start --- 
        // Log the raw response text to see what we actually received
        const responseText = await response.text();
        console.log("Raw Response Text from Server:", responseText);
        // --- Debugging End --- 

        // Now, attempt to parse the text we received and logged
        const responseData = JSON.parse(responseText);

        if (!response.ok) {
            // Throw an error with the message from WordPress or a default
            // Use responseData parsed above, as it might contain error details even if !response.ok
            throw new Error(responseData.message || 'Registration failed due to server error.');
        }

        // Assuming success if response.ok is true (status 2xx)
        console.log('Registration successful (Parsed Data):', responseData);

        // --- Update Success Handling ---
        // Instead of clearing form and showing message here,
        // navigate to the status page, passing email and initial state.
        navigate(`/registration-status?state=check_email&email=${encodeURIComponent(email)}`);
        
        // // Clear the form fields (Optional - do this if navigation doesn't automatically unmount/reset)
        // setCompanyName('');
        // setContactPerson('');
        // setLastName('');
        // setEmail('');
        // setPhone('');
        // setWebsite('');
        // setPassword('');
        // setConfirmPassword('');
        // setStep(1);
        // setFormErrors({}); 
        // // Display the success message from the API
        // setFormErrors({ general: responseData.message });
        // --- End Update Success Handling ---

    } catch (apiError: any) {
        // Log the specific error (could be network error or JSON.parse error)
        console.error("API Error or JSON Parse Failed:", apiError);
        // Display the error message from the caught error
        setFormErrors({ general: apiError.message || "Ошибка регистрации или ответа сервера." }); // Updated generic error
    } finally {
        setIsLoading(false);
    }
  };

  // Helper to display field errors
  const FieldError = ({ field }: { field: keyof FormErrors }) => {
    if (!formErrors[field]) return null;
    return <p className="text-xs text-red-400 mt-1">{formErrors[field]}</p>;
  };

  // Animation Variants
  const stepVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 50 },
  };

  return (
    <Card className="w-full max-w-md z-10 bg-[#0A2B6C]/20 backdrop-blur-lg border border-white/10 text-white p-6 rounded-2xl shadow-xl overflow-hidden"> {/* Added overflow-hidden */} 
      <CardHeader className="space-y-2 text-center mb-4">
        <CardTitle className="text-3xl font-bold">Регистрация</CardTitle>
      </CardHeader>
      {/* Use AnimatePresence for exit animations */}
      <AnimatePresence mode="wait"> 
        {step === 1 && (
          <motion.div
            key="step1"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <CardContent className="space-y-4">
              {/* Step 1 Fields: Company, Contact, Email, Phone, Website */}
              <div className="space-y-1">
                <Label htmlFor="companyName" className="text-base font-medium text-white/90">Название компании</Label>
                <Input id="companyName" name="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Введите название компании" required className={`bg-white/10 border-white/20 placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] h-11 px-4 text-base ${formErrors.companyName ? 'border-red-500' : ''}`} />
                <FieldError field="companyName" />
              </div>
               <div className="space-y-1">
                <Label htmlFor="contactPerson" className="text-base font-medium text-white/90">Контактное лицо (Имя)</Label>
                <Input id="contactPerson" name="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Введите ваше имя" required className={`bg-white/10 border-white/20 placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] h-11 px-4 text-base ${formErrors.contactPerson ? 'border-red-500' : ''}`} />
                <FieldError field="contactPerson" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName" className="text-base font-medium text-white/90">Фамилия</Label>
                <Input id="lastName" name="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Введите вашу фамилию" required className={`bg-white/10 border-white/20 placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] h-11 px-4 text-base ${formErrors.lastName ? 'border-red-500' : ''}`} />
                <FieldError field="lastName" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email" className="text-base font-medium text-white/90">Email</Label>
                <Input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Введите ваш email" required className={`bg-white/10 border-white/20 placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] h-11 px-4 text-base ${formErrors.email ? 'border-red-500' : ''}`} />
                <FieldError field="email" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-base font-medium text-white/90">Телефон</Label>
                <Input id="phone" name="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Введите номер телефона" required className={`bg-white/10 border-white/20 placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] h-11 px-4 text-base ${formErrors.phone ? 'border-red-500' : ''}`} />
                <FieldError field="phone" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="website" className="text-base font-medium text-white/90">Веб-сайт</Label>
                <Input id="website" name="website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Введите URL веб-сайта" className={`bg-white/10 border-white/20 placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] h-11 px-4 text-base ${formErrors.website ? 'border-red-500' : ''}`} />
                <FieldError field="website" />
              </div>
              {/* Display general message/error area for Step 1 */}
              {formErrors.general && step === 1 && ( 
                <p className="text-sm text-green-400 text-center font-medium pt-2">{formErrors.general}</p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 mt-4">
              <Button type="button" onClick={handleNextStep} className="w-full bg-[#8AB73A]/90 hover:bg-[#8AB73A] text-white h-12 text-base font-semibold rounded-lg">
                Далее
              </Button>
              <p className="text-center text-base text-white/70">
                Уже есть аккаунт?{' '}
                <Link to="/login" className="font-medium text-[#8AB73A] hover:underline">
                  Войти
                </Link>
              </p>
            </CardFooter>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            variants={stepVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.3 }}
          >
            <CardContent className="space-y-4">
              {/* Step 2 Fields: Password, Confirm Password */}
               <div className="space-y-1">
                  <Label htmlFor="password" className="text-base font-medium text-white/90">Пароль</Label>
                  <Input id="password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Минимум 8 символов" required className={`bg-white/10 border-white/20 placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] h-11 px-4 text-base ${formErrors.password ? 'border-red-500' : ''}`} />
                  <FieldError field="password" />
              </div>
              <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-base font-medium text-white/90">Подтвердите пароль</Label>
                  <Input id="confirmPassword" name="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Повторите пароль" required className={`bg-white/10 border-white/20 placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] h-11 px-4 text-base ${formErrors.confirmPassword ? 'border-red-500' : ''}`} />
                  <FieldError field="confirmPassword" />
              </div>
              {/* Display general error area for Step 2 */}
              {formErrors.general && step === 2 && (
                <p className="text-sm text-red-500 text-center font-medium pt-2">{formErrors.general}</p>
              )}
            </CardContent>
             <CardFooter className="flex flex-col space-y-4 mt-4">
                {/* Adjust button layout */}
                <div className="flex w-full items-center gap-4"> {/* Use gap for spacing */}
                   <Button 
                     type="button" 
                     variant="outline" 
                     onClick={handlePreviousStep} 
                     className="flex-1 bg-transparent border-white/50 hover:bg-white/10 text-white h-12 rounded-lg text-base font-medium" // Use flex-1 for equal width initially
                   >
                        Назад
                    </Button>
                    <Button 
                      type="button" 
                      onClick={handleFinalSubmit} 
                      disabled={isLoading} 
                      className="flex-1 bg-[#8AB73A]/90 hover:bg-[#8AB73A] text-white h-12 text-base font-semibold rounded-lg" // Use flex-1 for equal width initially
                    >
                        {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                    </Button>
                </div>
                <p className="text-center text-base text-white/70 pt-2"> {/* Added padding-top */}
                  Уже есть аккаунт?{' '}
                  <Link to="/login" className="font-medium text-[#8AB73A] hover:underline">
                      Войти
                  </Link>
                </p>
            </CardFooter>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}