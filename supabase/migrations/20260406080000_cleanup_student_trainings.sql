-- RPC: Atomic cleanup of a student's future trainings
-- Called when deactivating or before deleting a student.
-- Removes the student from future training sessions, cleans up
-- orphan attendance records, and deletes trainings left with zero students.
-- Returns the number of training-student links removed.

CREATE OR REPLACE FUNCTION public.cleanup_student_future_trainings(p_student_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removed INTEGER;
BEGIN
  -- 1. Remove student from today's and future trainings (junction table)
  DELETE FROM training_students
  WHERE student_id = p_student_id
    AND training_id IN (
      SELECT id FROM trainings WHERE date >= CURRENT_DATE
    );

  GET DIAGNOSTICS v_removed = ROW_COUNT;

  -- 2. Remove orphan attendance records for this student on future dates
  DELETE FROM attendance
  WHERE student_id = p_student_id
    AND date >= CURRENT_DATE;

  -- 3. Delete training sessions that now have ZERO students left
  DELETE FROM trainings
  WHERE date >= CURRENT_DATE
    AND id NOT IN (
      SELECT DISTINCT training_id FROM training_students
    );

  RETURN v_removed;
END;
$$;
