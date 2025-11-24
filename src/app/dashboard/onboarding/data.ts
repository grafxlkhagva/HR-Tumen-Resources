export type OnboardingTask = {
  id: string;
  text: string;
  completed: boolean;
};

export type OnboardingStage = {
  id: string;
  title: string;
  tasks: OnboardingTask[];
};

export type NewHire = {
  id: string;
  name: string;
  avatarId: string;
  title: string;
  startDate: string;
  stages: OnboardingStage[];
};

export const newHires: NewHire[] = [];
