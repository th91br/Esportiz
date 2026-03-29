// Types only - no more mock data

export interface Plan {
  id: string;
  name: string;
  sessionsPerWeek: number;
  price: number;
  billingType: 'monthly' | 'per_session';
}

export interface Student {
  id: string;
  name: string;
  phone: string;
  email: string;
  level: 'iniciante' | 'intermediário' | 'avançado';
  joinDate: string;
  photo?: string;
  active: boolean;
  planId?: string;
  paymentDueDay?: number;
  paymentStartDate?: string;
  birthDate?: string;
}

export interface Payment {
  id: string;
  userId: string;
  studentId: string;
  planId: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  paidAt?: string;
  monthRef: string;
  createdAt: string;
  isProrata: boolean;
  fullPrice?: number;
}

export type TimeSlot = '06:00' | '07:00' | '08:00' | '09:00' | '10:00' | '11:00' | '12:00' | '13:00' | '14:00' | '15:00' | '16:00' | '17:00' | '18:00' | '19:00' | '20:00' | '21:00' | '22:00' | '23:00' | '00:00';

export const timeSlots: TimeSlot[] = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00', '23:00', '00:00'
];

export const getTimePeriod = (time: TimeSlot): 'manhã' | 'tarde' | 'noite' => {
  const hour = parseInt(time.split(':')[0]);
  if (hour >= 6 && hour < 12) return 'manhã';
  if (hour >= 12 && hour < 18) return 'tarde';
  return 'noite';
};

export interface Training {
  id: string;
  date: string;
  time: TimeSlot;
  studentIds: string[];
  location: string;
  notes?: string;
}

export interface Attendance {
  id: string;
  trainingId: string;
  studentId: string;
  present: boolean;
  date: string;
}

export const getDayName = (dateString: string): string => {
  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const date = new Date(dateString + 'T12:00:00');
  return days[date.getDay()];
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export const getEndTime = (startTime: TimeSlot): string => {
  const hour = parseInt(startTime.split(':')[0]);
  const nextHour = hour === 23 ? 0 : hour + 1;
  return `${nextHour.toString().padStart(2, '0')}:00`;
};

export const getWeekDatesArray = (weekOffset = 0) => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + weekOffset * 7);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

export const getMonthName = (month: number): string => {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return months[month];
};

export const getWeekNumber = (dateString: string): number => {
  const date = new Date(dateString + 'T12:00:00');
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil((diff / oneWeek) + 1);
};

export const getWeekOffsetForDate = (dateString: string): number => {
  const target = new Date(dateString + 'T12:00:00');
  const today = new Date();
  const todayDow = today.getDay();
  const todayMonday = new Date(today);
  todayMonday.setDate(today.getDate() - (todayDow === 0 ? 6 : todayDow - 1));
  todayMonday.setHours(12, 0, 0, 0);

  const targetDow = target.getDay();
  const targetMonday = new Date(target);
  targetMonday.setDate(target.getDate() - (targetDow === 0 ? 6 : targetDow - 1));
  targetMonday.setHours(12, 0, 0, 0);

  const diffMs = targetMonday.getTime() - todayMonday.getTime();
  return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
};
