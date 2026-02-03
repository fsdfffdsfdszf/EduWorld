
import { Course } from './types';

export const MOCK_COURSES: Course[] = [
  {
    id: 'class-7-2026',
    title: 'Class 7 Academic Program 2026',
    description: 'A comprehensive academic program covering all core subjects for Class 7 students in the 2026 session.',
    instructor: 'Lead Academic Team',
    instructorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=edu',
    thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800',
    category: 'Academic',
    rating: 4.8,
    studentsCount: 15000,
    price: 49.99,
    subjects: [
      {
        id: 's1',
        name: 'Bangla',
        icon: 'fa-book-open',
        color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        subSubjects: [
          { id: 'ss1-1', name: 'Bangla 1st Paper', units: [{ id: 'u1-1-1', name: 'Prose & Poetry' }] },
          { id: 'ss1-2', name: 'Bangla 2nd Paper', units: [] }
        ]
      },
      {
        id: 's2',
        name: 'English',
        icon: 'fa-language',
        color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        subSubjects: [
          { id: 'ss2-1', name: 'Grammar', units: [] },
          { id: 'ss2-2', name: 'Literature', units: [] }
        ]
      }
    ],
    lessons: [
      {
        id: 'l1',
        title: 'Introduction to Class 7 Curriculum',
        content: '<h1>Welcome to the 2026 Academic Program</h1><p>In this module, we will go through the overview of all subjects and the learning path for the year...</p>',
        duration: '10:00',
        videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        hasAiFeature: true,
        subjectId: 's1',
        subSubjectId: 'ss1-1',
        unitId: 'u1-1-1',
        resources: [
          {
            id: 'res-1',
            title: 'Curriculum Guide (External)',
            url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            type: 'link',
            description: 'Official academic roadmap for 2026'
          },
          {
            id: 'res-2',
            title: 'Bengali Literature Wiki',
            url: 'https://en.wikipedia.org/wiki/Bengali_literature',
            type: 'link',
            description: 'Supplemental reading on literary history'
          }
        ]
      }
    ],
    roadmap: [
      { id: 'r1', icon: 'fa-calendar', text: 'Full Year Coverage' },
      { id: 'r2', icon: 'fa-vial', text: 'Practical Assessments' },
      { id: 'r3', icon: 'fa-trophy', text: 'Excellence Certification' }
    ]
  },
  {
    id: 'advanced-quantum-2027',
    title: 'Advanced Quantum Mechanics for Class 8',
    description: 'A future-proof curriculum introducing class 8 students to the fascinating world of quantum computing and physics.',
    instructor: 'Astro-Physics Dept',
    instructorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=quantum',
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=800',
    category: 'Future Science',
    rating: 5.0,
    studentsCount: 0,
    price: 99.00,
    isComingSoon: true,
    subjects: [],
    lessons: [],
    roadmap: [
      { id: 'r1', icon: 'fa-atom', text: 'Particle Wave Theory' },
      { id: 'r2', icon: 'fa-microchip', text: 'Quantum Gateways' }
    ]
  }
];
