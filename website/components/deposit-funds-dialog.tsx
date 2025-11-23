'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  Wallet,
  DollarSign,
  Loader2,
  CheckCircle,
  AlertCircle,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  getUserPaymentMethods,
  PaymentMethod,
  initiateDeposit,
} from '@/lib/payment';

// Form schema for deposit amount
const formSchema = z.object({
  amount: z
    .string()
    .min(1, { message: 'Amount is required' })
    .refine((val) => !isNaN(Number(val)), { message: 'Amount must be a number' })
    .refine((val) => Number(val) >= 10, { message: 'Amount must be at least $10' }),
  paymentMethodId: z.string().min(1, { message: 'Payment method is required' }),
});

type FormValues = z.infer<typeof formSchema>;

interface DepositFundsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DepositFundsDialog({
  isOpen,
  onClose,
}: DepositFundsDialogProps) {
  const [status, setStatus] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoadingPaymentMethods, setIsLoadingPaymentMethods] = useState(false);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: '',
      paymentMethodId: '',
    },
  });

  // Load payment methods on open
  useEffect(() => {
    if (isOpen) {
      loadPaymentMethods();
    }
  }, [isOpen]);

  // Load user payment methods
  async function loadPaymentMethods() {
    try {
      setIsLoadingPaymentMethods(true);
      const methods = await getUserPaymentMethods();
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    } finally {
      setIsLoadingPaymentMethods(false);
    }
  }

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    try {
      setStatus('processing');

      // Initiate deposit
      await initiateDeposit(Number(data.amount), data.paymentMethodId);

      // Success
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage('Failed to process deposit. Please try again later.');
      console.error('Deposit error:', error);
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

  // Helper function to render payment method icon
  const renderPaymentMethodIcon = (type: PaymentMethod['type']) => {
    switch (type) {
      case 'crypto':
        return <Wallet className="h-5 w-5" />;
      case 'credit_card':
        return <CreditCard className="h-5 w-5" />;
      case 'bank_transfer':
        return <DollarSign className="h-5 w-5" />;
      default:
        return <DollarSign className="h-5 w-5" />;
    }
  };

  // Helper function to format payment method label
  const formatPaymentMethodLabel = (method: PaymentMethod) => {
    switch (method.type) {
      case 'crypto':
        return `${method.details.name} (${method.details.address?.substring(0, 6)}...${method.details.address?.substring(
          method.details.address.length - 4
        )})`;
      case 'credit_card':
        return `${method.details.name} •••• ${method.details.last4}`;
      case 'bank_transfer':
        return `${method.details.bankName}`;
      default:
        return 'Unknown payment method';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        {status === 'form' && (
          <>
            <DialogHeader>
              <DialogTitle>Deposit Funds</DialogTitle>
              <DialogDescription>
                Add funds to your account to create bounties for issues.
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6 py-4"
              >
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (USD)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            className="pl-9"
                            placeholder="100"
                            {...field}
                            type="number"
                            min="10"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Minimum deposit amount is $10
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethodId"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Payment Method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="space-y-3"
                        >
                          {isLoadingPaymentMethods ? (
                            <div className="flex justify-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                          ) : paymentMethods.length === 0 ? (
                            <div className="text-center py-4 border rounded-md">
                              <p className="text-muted-foreground mb-2">
                                No payment methods available
                              </p>
                              <Button variant="outline" size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Payment Method
                              </Button>
                            </div>
                          ) : (
                            paymentMethods.map((method) => (
                              <div
                                key={method.id}
                                className={`flex items-center space-x-2 border rounded-md p-4 cursor-pointer hover:border-primary transition-colors ${
                                  field.value === method.id
                                    ? 'border-primary bg-primary/5'
                                    : ''
                                }`}
                                onClick={() => field.onChange(method.id)}
                              >
                                <RadioGroupItem
                                  value={method.id}
                                  id={method.id}
                                />
                                <div className="flex flex-1 items-center">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                                    {renderPaymentMethodIcon(method.type)}
                                  </div>
                                  <label
                                    htmlFor={method.id}
                                    className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                  >
                                    {formatPaymentMethodLabel(method)}
                                  </label>
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            ))
                          )}
                          
                          <div className="flex items-center justify-center mt-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-xs"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add New Payment Method
                            </Button>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button variant="outline" type="button" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit">Deposit</Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}

        {status === 'processing' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
            <h3 className="text-lg font-medium">Processing Deposit</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Please wait while we process your deposit...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-lg font-medium">Deposit Successful!</h3>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Your funds have been added to your account. You can now create bounties for issues.
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
              <Button onClick={() => setStatus('form')}>Try Again</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
