import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Sparkles, Shield, ArrowRight, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCurrency, type Currency } from '@/lib/currency-context';

interface PostSignupFlowProps {
  open: boolean;
  onClose: () => void;
}

export function PostSignupFlow({ open, onClose }: PostSignupFlowProps) {
  const { setCurrency } = useCurrency();
  const [step, setStep] = useState<'currency' | 'plan' | 'mfa'>('currency');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium' | null>(null);

  const currencies: Array<{ code: Currency; name: string; symbol: string }> = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  ];

  const plans = [
    {
      name: 'Free',
      tier: 'free' as const,
      price: '$0',
      description: 'Perfect for getting started',
      features: [
        'Track up to 5 subscriptions',
        'Basic spending overview',
        'Monthly spending reports',
      ],
    },
    {
      name: 'Premium',
      tier: 'premium' as const,
      price: '$9.99',
      period: '/month',
      description: 'Unlock powerful insights',
      features: [
        "Unlimited subscriptions",
        "AI-powered recommendations",
        "Browser extension tracking",
        "Cost-per-use analytics",
      ],
      popular: true,
    },
  ];

  const handlePlanSelect = (tier: 'free' | 'premium') => {
    setSelectedPlan(tier);
    if (tier === 'premium') {
      // Store selection and redirect after closing
      localStorage.setItem('postSignupPlan', 'premium');
      onClose();
      // Redirect after a brief delay to allow modal to close
      setTimeout(() => {
        window.location.href = '/pricing';
      }, 100);
    } else {
      // Go to 2FA prompt
      setStep('mfa');
    }
  };

  const handleCurrencySelect = (currency: Currency) => {
    setCurrency(currency);
    setStep('plan');
  };

  const handle2FADecision = (setup: boolean) => {
    if (setup) {
      // Store that user wants to set up 2FA and redirect after closing
      localStorage.setItem('postSignupSetup2FA', 'true');
      onClose();
      setTimeout(() => {
        window.location.href = '/settings';
      }, 100);
    } else {
      // Just close and show dashboard/tutorial
      onClose();
    }
  };

  if (step === 'currency') {
    return (
      <Dialog open={open}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Globe className="h-5 w-5 text-purple-600" />
              </div>
              <DialogTitle>Select Your Currency</DialogTitle>
            </div>
            <DialogDescription className="mt-2">
              Choose your preferred currency for displaying all subscription amounts
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 py-4">
            {currencies.map((curr) => (
              <Button
                key={curr.code}
                variant="outline"
                className="h-auto flex flex-col items-center justify-center p-3 hover:bg-primary hover:text-primary-foreground"
                onClick={() => handleCurrencySelect(curr.code)}
              >
                <span className="text-2xl font-bold">{curr.symbol}</span>
                <span className="text-xs font-medium mt-1">{curr.code}</span>
                <span className="text-xs text-muted-foreground">{curr.name}</span>
              </Button>
            ))}
          </div>

          <div className="text-sm text-muted-foreground text-center">
            You can change this anytime in settings
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'plan') {
    return (
      <Dialog open={open}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Welcome to Subveris! 🎉</DialogTitle>
            <DialogDescription>
              Let's get you started. Choose a plan that works best for you.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
            {plans.map((plan) => (
              <Card
                key={plan.tier}
                className={`relative flex flex-col cursor-pointer transition-all ${
                  plan.popular ? 'ring-2 ring-primary' : ''
                } hover:shadow-md`}
                onClick={() => handlePlanSelect(plan.tier)}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-4">
                    <Badge className="gap-1">
                      <Sparkles className="h-3 w-3" />
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    {plan.tier === 'free' ? 'Get Started Free' : 'Choose Premium'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'mfa') {
    return (
      <Dialog open={open}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <DialogTitle>Protect Your Account</DialogTitle>
            </div>
            <DialogDescription className="mt-2">
              Enable two-factor authentication (2FA) to add an extra layer of security
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 shrink-0">
                  <span className="text-xs font-bold text-green-600">✓</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Secure Your Login</p>
                  <p className="text-sm text-muted-foreground">
                    Require a code from your authenticator app when signing in
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 shrink-0">
                  <span className="text-xs font-bold text-green-600">✓</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Prevent Unauthorized Access</p>
                  <p className="text-sm text-muted-foreground">
                    Even if someone has your password, they can't access your account
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 shrink-0">
                  <span className="text-xs font-bold text-green-600">✓</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Works Offline</p>
                  <p className="text-sm text-muted-foreground">
                    Use Google Authenticator, Authy, or Microsoft Authenticator
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 sm:flex-row-reverse">
            <Button
              onClick={() => handle2FADecision(true)}
              className="gap-2"
            >
              Set Up 2FA <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => handle2FADecision(false)}
            >
              Skip for Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
