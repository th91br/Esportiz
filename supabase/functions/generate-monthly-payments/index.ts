import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: { headers: { Authorization: req.headers.get("Authorization")! } },
            }
        );

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (authError || !user) {
            throw new Error("Unauthorized");
        }

        const { monthRef } = await req.json();
        if (!monthRef) {
            throw new Error("monthRef is required");
        }

        const [year, month] = monthRef.split("-").map(Number);

        const [
            { data: studentsRaw, error: studentsError },
            { data: plansRaw, error: plansError },
            { data: paymentsRaw, error: paymentsError },
            { data: allTrainings, error: trainingsError }
        ] = await Promise.all([
            supabaseClient.from("students").select("*"),
            supabaseClient.from("plans").select("*"),
            supabaseClient.from("payments").select("student_id").eq("month_ref", monthRef),
            supabaseClient.from("trainings").select("*, training_students(student_id)").order("date")
        ]);

        if (studentsError || plansError || paymentsError || trainingsError) {
            throw new Error("Failed to load dependent data");
        }

        const monthlyStudents = studentsRaw.filter(s => {
            if (!s.active || !s.plan_id || !s.payment_due_day) return false;
            const plan = plansRaw.find(p => p.id === s.plan_id);
            return plan && plan.billing_type === "monthly";
        });

        const studentsWithPayment = new Set(paymentsRaw.map(p => p.student_id));
        const toCreate = monthlyStudents.filter(s => !studentsWithPayment.has(s.id));

        if (toCreate.length === 0) {
            return new Response(JSON.stringify({ message: "No new payments to generate" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }

        const inserts = toCreate.map(s => {
            const plan = plansRaw.find(p => p.id === s.plan_id);
            const maxDay = new Date(year, month, 0).getDate();
            const day = Math.min(s.payment_due_day, maxDay);
            const dueDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

            const studentTrainings = (allTrainings || [])
                .filter((t) => (t.training_students || []).some((ts) => ts.student_id === s.id))
                .sort((a, b) => a.date.localeCompare(b.date));
            const firstTraining = studentTrainings[0];

            let amount = Number(plan.price);
            let isProrata = false;
            let fullPrice = null;

            if (firstTraining) {
                const firstDate = new Date(firstTraining.date + 'T12:00:00');
                const firstMonth = firstDate.getMonth() + 1;
                const firstYear = firstDate.getFullYear();
                const firstDay = firstDate.getDate();

                const isFirstMonth = firstYear === year && firstMonth === month;
                const prevMonth = month === 1 ? 12 : month - 1;
                const prevYear = month === 1 ? year - 1 : year;
                const wasLastWeekPrevMonth = firstYear === prevYear && firstMonth === prevMonth && firstDay >= 24;

                if (isFirstMonth && firstDay > 7) {
                    const daysInMonth = new Date(year, month, 0).getDate();
                    const totalWeeks = Math.ceil(daysInMonth / 7);
                    const startWeek = Math.ceil(firstDay / 7);
                    const remainingWeeks = totalWeeks - startWeek + 1;
                    const weeklyRate = Number(plan.price) / totalWeeks;
                    amount = Math.round(weeklyRate * remainingWeeks * 100) / 100;
                    isProrata = true;
                    fullPrice = Number(plan.price);
                }
            }

            return {
                user_id: user.id,
                student_id: s.id,
                plan_id: s.plan_id,
                amount,
                due_date: dueDate,
                month_ref: monthRef,
                is_prorata: isProrata,
                full_price: fullPrice,
            };
        });

        const { error: insertError } = await supabaseClient.from("payments").insert(inserts);

        if (insertError) {
            throw insertError;
        }

        return new Response(JSON.stringify({
            message: "Payments generated successfully",
            count: inserts.length
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
