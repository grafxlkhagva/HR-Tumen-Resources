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

export const newHires: NewHire[] = [
  {
    id: 'nh-001',
    name: 'Olivia Martin',
    avatarId: 'avatar-7',
    title: 'Product Manager',
    startDate: '2024-08-01',
    stages: [
      {
        id: 's1',
        title: 'Before Day 1',
        tasks: [
          { id: 't1-1', text: 'Sign employment contract', completed: true },
          { id: 't1-2', text: 'Complete background check', completed: true },
          { id: 't1-3', text: 'Provide bank details for payroll', completed: false },
        ],
      },
      {
        id: 's2',
        title: 'First Day',
        tasks: [
          { id: 't2-1', text: 'Office tour and team introductions', completed: false },
          { id: 't2-2', text: 'Set up work computer and accounts', completed: false },
          { id: 't2-3', text: 'Review company handbook', completed: false },
        ],
      },
      {
        id: 's3',
        title: 'First Week',
        tasks: [
          { id: 't3-1', text: 'One-on-one with manager', completed: false },
          { id: 't3-2', text: 'Attend project kick-off meeting', completed: false },
          { id: 't3-3', text: 'Complete mandatory compliance training', completed: false },
        ],
      },
    ],
  },
  {
    id: 'nh-002',
    name: 'Jackson Lee',
    avatarId: 'avatar-8',
    title: 'Software Engineer',
    startDate: '2024-07-15',
     stages: [
      {
        id: 's1',
        title: 'Before Day 1',
        tasks: [
          { id: 't1-1', text: 'Sign employment contract', completed: true },
          { id: 't1-2', text: 'Complete background check', completed: true },
          { id: 't1-3', text: 'Provide bank details for payroll', completed: true },
        ],
      },
      {
        id: 's2',
        title: 'First Day',
        tasks: [
          { id: 't2-1', text: 'Office tour and team introductions', completed: true },
          { id: 't2-2', text: 'Set up work computer and accounts', completed: true },
          { id: 't2-3', text: 'Review company handbook', completed: true },
        ],
      },
      {
        id: 's3',
        title: 'First Week',
        tasks: [
          { id: 't3-1', text: 'One-on-one with manager', completed: true },
          { id: 't3-2', text: 'Set up local development environment', completed: true },
          { id: 't3-3', text: 'Complete mandatory compliance training', completed: true },
        ],
      },
    ],
  },
];
