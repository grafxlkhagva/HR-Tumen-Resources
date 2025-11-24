'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { newHires, OnboardingStage } from './data';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const calculateProgress = (stages: OnboardingStage[]) => {
  const allTasks = stages.flatMap((stage) => stage.tasks);
  if (allTasks.length === 0) return 0;
  const completedTasks = allTasks.filter((task) => task.completed).length;
  return (completedTasks / allTasks.length) * 100;
};

export default function OnboardingPage() {
  const [selectedHireId, setSelectedHireId] = React.useState(newHires[0].id);
  const selectedHire = newHires.find((h) => h.id === selectedHireId) || newHires[0];

  const progress = calculateProgress(selectedHire.stages);

  return (
    <div className="py-8 grid gap-8 md:grid-cols-[250px_1fr]">
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">New Hires</h2>
        <div className="grid gap-2">
            {newHires.map((hire) => {
                const avatar = PlaceHolderImages.find(p => p.id === hire.avatarId);
                return (
                    <Button
                        key={hire.id}
                        variant={selectedHireId === hire.id ? 'secondary' : 'ghost'}
                        className="w-full justify-start gap-3 p-2 h-auto"
                        onClick={() => setSelectedHireId(hire.id)}
                    >
                         <Avatar className="h-9 w-9">
                          <AvatarImage src={avatar?.imageUrl} alt="Avatar" data-ai-hint={avatar?.imageHint} />
                          <AvatarFallback>{hire.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                            <div className="font-medium">{hire.name}</div>
                            <div className="text-xs text-muted-foreground">{hire.title}</div>
                        </div>
                    </Button>
                )
            })}
        </div>
      </div>

      <div>
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle className='text-2xl'>{selectedHire.name}'s Onboarding</CardTitle>
                    <CardDescription>
                    Start Date: {new Date(selectedHire.startDate).toLocaleDateString()}
                    </CardDescription>
                </div>
                 <div className="flex items-center gap-4 w-full sm:w-auto">
                    <Progress value={progress} className="h-2 flex-1" />
                    <span className="text-sm font-medium text-muted-foreground">{Math.round(progress)}%</span>
                </div>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion
              type="multiple"
              defaultValue={['s1', 's2']}
              className="w-full"
            >
              {selectedHire.stages.map((stage) => (
                <AccordionItem value={stage.id} key={stage.id}>
                  <AccordionTrigger className="text-lg font-medium">
                    {stage.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col gap-4 pt-2">
                      {stage.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center space-x-3 rounded-md border p-4 transition-colors hover:bg-muted/50"
                        >
                          <Checkbox
                            id={task.id}
                            checked={task.completed}
                            className="h-5 w-5"
                          />
                          <label
                            htmlFor={task.id}
                            className={cn(
                              'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                              task.completed && 'line-through text-muted-foreground'
                            )}
                          >
                            {task.text}
                          </label>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
