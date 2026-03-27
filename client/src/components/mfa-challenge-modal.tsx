import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Shield } from 'lucide-react';

interface MFAChallengeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerifySuccess: () => void;
}

export function MFAChallengeModal({ open, onOpenChange, onVerifySuccess }: MFAChallengeModalProps) {
  const { verifyMfa, pendingMfaFactors } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code || code.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter a valid 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    if (pendingMfaFactors.length === 0) {
      toast({
        title: 'Error',
        description: 'No MFA factors found',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const factorId = pendingMfaFactors[0].id; // Use first TOTP factor
    const { error } = await verifyMfa(code, factorId);
    setLoading(false);

    if (error) {
      toast({
        title: 'Verification Failed',
        description: error.message || 'Invalid code. Please try again.',
        variant: 'destructive',
      });
      setCode('');
    } else {
      toast({
        title: 'Verified',
        description: 'You are now signed in',
      });
      setCode('');
      onOpenChange(false);
      onVerifySuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <DialogTitle>Two-Factor Authentication</DialogTitle>
          </div>
          <DialogDescription>
            Enter the 6-digit code from your authenticator app to continue
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Authentication Code</Label>
            <Input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={code}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(value);
              }}
              maxLength={6}
              disabled={loading}
              className="text-center text-2xl tracking-widest"
              autoFocus
            />
            <p className="text-sm text-muted-foreground">
              Look for a 6-digit code in Google Authenticator, Authy, or your authenticator app
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
            {loading ? 'Verifying...' : 'Verify'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
