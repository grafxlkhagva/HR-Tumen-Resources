'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  updateDocumentNonBlocking,
  useFirebase,
} from '@/firebase';
import { doc, increment } from 'firebase/firestore';
import { Loader2, UserPlus, UserRoundCheck } from 'lucide-react';
import type { Employee } from '../employees/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Position {
  id: string;
  title: string;
  filled: number;
}

interface AssignEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: Position | null;
  employees: Employee[];
  onAddNewEmployee: (position: Position) => void;
}

export function AssignEmployeeDialog({
  open,
  onOpenChange,
  position,
  employees,
  onAddNewEmployee
}: AssignEmployeeDialogProps) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const [step, setStep] = React.useState(1);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showFullError, setShowFullError] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      // Reset to step 1 when dialog is closed
      setTimeout(() => {
        setStep(1);
        setShowFullError(false);
      }, 200);
    }
  }, [open]);

  const assignableEmployees = React.useMemo(() => {
    return employees.filter(emp => emp.status === 'Идэвхтэй' && !emp.positionId);
  }, [employees]);


  const handleAssignEmployee = async (employeeId: string) => {
    if (!firestore || !position) return;

    setIsSubmitting(true);
    
    try {
        const employeeDocRef = doc(firestore, 'employees', employeeId);
        updateDocumentNonBlocking(employeeDocRef, {
            positionId: position.id,
            jobTitle: position.title,
        });
        
        const positionDocRef = doc(firestore, 'positions', position.id);
        updateDocumentNonBlocking(positionDocRef, {
            filled: increment(1)
        });

        toast({
        title: 'Амжилттай томилогдлоо',
        });
        
    } catch(error) {
        console.error("Error assigning employee: ", error);
        toast({
            variant: "destructive",
            title: "Алдаа",
            description: "Ажилтан томилоход алдаа гарлаа."
        });
    } finally {
        setIsSubmitting(false);
        onOpenChange(false);
    }
  };

  const handleSelectExisting = () => {
    setStep(2);
  }

  return (
    <>
      <AlertDialog open={showFullError} onOpenChange={setShowFullError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Орон тоо дүүрсэн</AlertDialogTitle>
            <AlertDialogDescription>
              Энэ ажлын байранд ажилтан томилогдсон байна. Шинээр ажилтан томилохын тулд эхлээд өмнөх ажилтныг чөлөөлнө үү.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction onClick={() => setShowFullError(false)}>Хаах</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>"{position?.title}" ажлын байранд томилгоо хийх</DialogTitle>
            <DialogDescription>
              {step === 1 ? 'Хийх үйлдлээ сонгоно уу.' : 'Томилох ажилтнаа сонгоно уу.'}
            </DialogDescription>
          </DialogHeader>
          
          {isSubmitting && <div className="absolute inset-0 bg-background/50 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}
          
          {step === 1 && (
              <div className="grid grid-cols-1 gap-4 py-4">
                  <Card onClick={handleSelectExisting} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4 flex items-center gap-4">
                          <UserRoundCheck className="h-8 w-8 text-primary" />
                          <div>
                              <h3 className="font-semibold">Томилгоогүй ажилтан сонгох</h3>
                              <p className="text-sm text-muted-foreground">Бүртгэлтэй ажилтнаас томилох</p>
                          </div>
                      </CardContent>
                  </Card>
                  <Card onClick={() => position && onAddNewEmployee(position)} className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4 flex items-center gap-4">
                          <UserPlus className="h-8 w-8 text-green-500" />
                          <div>
                              <h3 className="font-semibold">Шинэ ажилтан бүртгэх</h3>
                              <p className="text-sm text-muted-foreground">Системд шинээр ажилтан бүртгэж томилох</p>
                          </div>
                      </CardContent>
                  </Card>
              </div>
          )}

          {step === 2 && (
              <div className="pt-4">
                  <ScrollArea className="h-72">
                      <div className="space-y-2 pr-4">
                          {assignableEmployees.length === 0 ? (
                              <div className="text-center py-10 text-muted-foreground">
                                  Томилгоогүй, идэвхтэй ажилтан байхгүй байна.
                              </div>
                          ) : (
                              assignableEmployees.map((emp) => (
                                  <Card key={emp.id} onClick={() => handleAssignEmployee(emp.id)} className="cursor-pointer hover:bg-muted/80 transition-colors">
                                      <CardContent className="p-3 flex items-center gap-4">
                                          <Avatar>
                                              <AvatarImage src={emp.photoURL} />
                                              <AvatarFallback>{emp.firstName.charAt(0)}{emp.lastName.charAt(0)}</AvatarFallback>
                                          </Avatar>
                                          <div>
                                              <p className="font-semibold">{emp.firstName} {emp.lastName}</p>
                                              <p className="text-xs text-muted-foreground">{emp.employeeCode}</p>
                                          </div>
                                      </CardContent>
                                  </Card>
                              ))
                          )}
                      </div>
                  </ScrollArea>
                  <Button variant="ghost" onClick={() => setStep(1)} className="mt-4 w-full">Буцах</Button>
              </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

