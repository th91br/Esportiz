import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function MockDataInjector() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const injectData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 0. Clean up existing data to avoid duplicates? (optional, but let's assume it's a fresh or test account)
      
      // 1. Insert Plans
      const { data: plans } = await supabase.from('plans').insert([
        { user_id: user.id, name: 'Mensal', price: 130, sessions_per_week: 2, billing_type: 'monthly', is_active: true },
        { user_id: user.id, name: 'Trimestral', price: 350, sessions_per_week: 3, billing_type: 'monthly', is_active: true },
        { user_id: user.id, name: 'Semestral', price: 650, sessions_per_week: 2, billing_type: 'monthly', is_active: true }
      ]).select();

      const planMensal = plans?.find(p => p.name === 'Mensal')?.id;
      const planTrimestral = plans?.find(p => p.name === 'Trimestral')?.id;
      const planSemestral = plans?.find(p => p.name === 'Semestral')?.id;

      // 2. Insert Students
      // To simulate "Desde", we might not be able to set created_at directly if it's protected, but let's try.
      const { data: students } = await supabase.from('students').insert([
        { user_id: user.id, name: 'Lucas Andrade', phone: '51991234567', level: 'iniciante', active: true, plan_id: planMensal, payment_due_day: 1 },
        { user_id: user.id, name: 'Marina Costa', phone: '51987654321', level: 'avancado', active: true, plan_id: planTrimestral, payment_due_day: 1 },
        { user_id: user.id, name: 'Pedro Souza', phone: '51976543210', level: 'intermediario', active: true, plan_id: planMensal, payment_due_day: 1 },
        { user_id: user.id, name: 'Carla Mendes', phone: '51965432109', level: 'avancado', active: true, plan_id: planSemestral, payment_due_day: 1 },
        { user_id: user.id, name: 'Rafael Lima', phone: '51954321098', level: 'iniciante', active: true, plan_id: planMensal, payment_due_day: 1 },
        { user_id: user.id, name: 'Beatriz Santos', phone: '51943210987', level: 'kids', active: true, plan_id: planTrimestral, payment_due_day: 1 },
        { user_id: user.id, name: 'Tiago Ferreira', phone: '51932109876', level: 'iniciante', active: true, plan_id: planMensal, payment_due_day: 1 },
        { user_id: user.id, name: 'Ana Beatriz Rocha', phone: '51921098765', level: 'kids', active: true, plan_id: planMensal, payment_due_day: 1 },
      ]).select();

      const getStudent = (name: string) => students?.find(s => s.name === name)?.id;

      // 3. Insert Trainings (April 2025 schedule + Today)
      // We will set today to "2025-04-10" for the presentation context, but since the app uses real current date,
      // let's create trainings on the real "today" and "tomorrow" so they show up, AND create specific ones for April 2025.
      const todayDate = new Date();
      const todayStr = todayDate.toISOString().split('T')[0];
      const monthStr = todayDate.toISOString().slice(0, 7);

      const { data: trainings } = await supabase.from('trainings').insert([
        { user_id: user.id, date: todayStr, time: '18:00', location: 'Futevôlei Iniciante', notes: 'Treino Iniciante' },
        { user_id: user.id, date: todayStr, time: '07:00', location: 'Beach Tennis Avançado', notes: 'Treino Avançado' },
        { user_id: user.id, date: todayStr, time: '16:00', location: 'Kids & Teens', notes: 'Treino Kids' },
        { user_id: user.id, date: todayStr, time: '08:00', location: 'Weekend Warriors', notes: 'Treino Especial' },
      ]).select();

      const tFutevolei = trainings?.find(t => t.location === 'Futevôlei Iniciante')?.id;
      const tBeachTennis = trainings?.find(t => t.location === 'Beach Tennis Avançado')?.id;

      // 4. Link students to trainings
      if (tFutevolei && tBeachTennis) {
        await supabase.from('student_trainings').insert([
          { student_id: getStudent('Lucas Andrade'), training_id: tFutevolei },
          { student_id: getStudent('Marina Costa'), training_id: tFutevolei },
          { student_id: getStudent('Carla Mendes'), training_id: tFutevolei },
          { student_id: getStudent('Pedro Souza'), training_id: tFutevolei },
          { student_id: getStudent('Rafael Lima'), training_id: tFutevolei },
          { student_id: getStudent('Tiago Ferreira'), training_id: tFutevolei },
          { student_id: getStudent('Beatriz Santos'), training_id: tFutevolei },
        ]);
      }

      // 5. Insert Attendance
      if (tFutevolei) {
        await supabase.from('attendance').insert([
          { user_id: user.id, student_id: getStudent('Lucas Andrade'), training_id: tFutevolei, date: todayStr, present: true },
          { user_id: user.id, student_id: getStudent('Marina Costa'), training_id: tFutevolei, date: todayStr, present: true },
          { user_id: user.id, student_id: getStudent('Carla Mendes'), training_id: tFutevolei, date: todayStr, present: true },
          { user_id: user.id, student_id: getStudent('Pedro Souza'), training_id: tFutevolei, date: todayStr, present: false },
          { user_id: user.id, student_id: getStudent('Rafael Lima'), training_id: tFutevolei, date: todayStr, present: true },
          { user_id: user.id, student_id: getStudent('Tiago Ferreira'), training_id: tFutevolei, date: todayStr, present: false },
          { user_id: user.id, student_id: getStudent('Beatriz Santos'), training_id: tFutevolei, date: todayStr, present: true },
        ]);
      }

      // 6. Insert Payments
      await supabase.from('payments').insert([
        { user_id: user.id, student_id: getStudent('Lucas Andrade'), amount: 130, month_ref: monthStr, paid: true, due_date: `${monthStr}-01` },
        { user_id: user.id, student_id: getStudent('Marina Costa'), amount: 350, month_ref: monthStr, paid: true, due_date: `${monthStr}-01` },
        { user_id: user.id, student_id: getStudent('Carla Mendes'), amount: 650, month_ref: monthStr, paid: true, due_date: `${monthStr}-01` },
        { user_id: user.id, student_id: getStudent('Rafael Lima'), amount: 130, month_ref: monthStr, paid: true, due_date: `${monthStr}-01` },
        { user_id: user.id, student_id: getStudent('Beatriz Santos'), amount: 350, month_ref: monthStr, paid: true, due_date: `${monthStr}-01` },
        { user_id: user.id, student_id: getStudent('Pedro Souza'), amount: 130, month_ref: monthStr, paid: false, due_date: `${monthStr}-01` },
        { user_id: user.id, student_id: getStudent('Tiago Ferreira'), amount: 130, month_ref: monthStr, paid: false, due_date: `${monthStr}-01` }, // "Atrasado" if past due
      ]);

      alert('Dados inseridos com sucesso! Recarregue a página.');
    } catch (error) {
      console.error(error);
      alert('Erro ao inserir dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={injectData} disabled={loading} className="fixed bottom-4 left-4 z-50">
      {loading ? 'Inserindo...' : 'Injetar Dados Fictícios'}
    </Button>
  );
}
