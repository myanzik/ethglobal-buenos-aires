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
import { DollarSign, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Issue } from '@/lib/github-api';

// Form schema for bounty amount
const formSchema = z.object({
  amount: z
    .string()
    .min(1, { message: 'Amount is required' })
    .refine((val) => !isNaN(Number(val)), { message: 'Amount must be a number' })
    .refine((val) => Number(val) >= 5, { message: 'Amount must be at least $5' }),
});

type FormValues = z.infer<typeof formSchema>;

interface AddBountyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  issue: Issue;
}

export function AddBountyDialog({ isOpen, onClose, issue }: AddBountyDialogProps) {
  const [status, setStatus] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: '',
    },
  });

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    try {
      setStatus('processing');
      
      // Simulate API call with timeout
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      // In a real app, this would be an API call to add the bounty
      // const response = await addBounty(issue.id, Number(data.amount));
      
      // Simulate successful response
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage('Failed to add bounty. Please try again later.');
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
              <DialogTitle>Add Bounty</DialogTitle>
              <DialogDescription>
                Add a bounty to issue #{issue.number} - {issue.title} in {issue.repository.full_name}
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bounty Amount (USD)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            className="pl-9" 
                            placeholder="100" 
                            {...field}
                            type="number"
                            min="5"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        This amount will be locked until the issue is resolved
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Bounty</Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}

        {status === 'processing' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
            <h3 className="text-lg font-medium">Processing</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Please wait while we add your bounty to the issue...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-lg font-medium">Bounty Added!</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Your bounty has been successfully added to issue #{issue.number}.
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
