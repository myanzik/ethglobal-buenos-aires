'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Form schema for wallet address
const formSchema = z.object({
  walletAddress: z
    .string()
    .min(1, { message: 'Wallet address is required' })
    .regex(/^0x[a-fA-F0-9]{40}$/, { message: 'Must be a valid Ethereum address' }),
});

type FormValues = z.infer<typeof formSchema>;

interface ClaimRewardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reward: {
    id: string | number;
    title: string;
    amount: number;
    prNumber?: number;
    repository?: string;
  };
}

export function ClaimRewardDialog({ isOpen, onClose, reward }: ClaimRewardDialogProps) {
  const [status, setStatus] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      walletAddress: '',
    },
  });

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    try {
      setStatus('processing');
      
      // Simulate API call with timeout
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // In a real app, this would be an API call to claim the reward
      // const response = await claimReward(reward.id, data.walletAddress);
      
      // Simulate successful response
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage('Failed to claim reward. Please try again later.');
    }
  };

  // Reset the form when dialog is closed
  const handleClose = () => {
    if (status !== 'processing') {
      setStatus('form');
      form.reset();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        {status === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle>Claim Reward</DialogTitle>
              <DialogDescription>
                You're about to claim ${reward.amount} for your contribution to {reward.repository} #{reward.prNumber}.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                <FormField
                  control={form.control}
                  name="walletAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Ethereum Wallet Address</FormLabel>
                      <FormControl>
                        <Input placeholder="0x..." {...field} />
                      </FormControl>
                      <FormDescription>
                        The reward will be sent to this address
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit">Claim Reward</Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}

        {status === 'processing' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
            <h3 className="text-lg font-medium">Processing Claim</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Please wait while we process your reward claim...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-lg font-medium">Claim Successful!</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Your reward of ${reward.amount} has been sent to your wallet.
            </p>
            <Button onClick={handleClose} className="mt-6">
              Close
            </Button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <h3 className="text-lg font-medium">Something went wrong</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {errorMessage}
            </p>
            <div className="flex gap-2 mt-6">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setStatus('form')}>
                Try Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
