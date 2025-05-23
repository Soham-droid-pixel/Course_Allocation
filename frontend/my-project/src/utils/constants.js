export const COURSE_TYPES = {
  PECL1: 'Professional Elective Course 1',
  PECL2: 'Professional Elective Course 2',
  OPEN: 'Open Elective',
  HONORS: 'Honors Course',
  MINOR: 'Minor Course',
  MDM: 'Multi-Disciplinary Course'
}

export const API_ENDPOINTS = {
  LOGIN: '/api/auth/login',
  ALLOCATE: '/api/allocate',
  DOWNLOAD_REPORT: '/api/download',
  SUBMIT_PREFERENCES: '/api/preferences/submit'
}

export const COURSES = {
  PECL1: [
    { id: 1, name: 'Blockchain Technology', seats: 60 },
    { id: 2, name: 'Deep Learning', seats: 60 },
    { id: 3, name: 'Cyber Security', seats: 60 }
  ],
  PECL2: [
    { id: 4, name: 'UI/UX Design', seats: 60 },
    { id: 5, name: 'Quantum Computing', seats: 40 },
    { id: 6, name: 'Cloud Computing', seats: 60 }
  ],
  OPEN: [
    { id: 7, name: 'IoT Systems', seats: 60 },
    { id: 8, name: 'E-Vehicle Technology', seats: 40 }
  ]
}