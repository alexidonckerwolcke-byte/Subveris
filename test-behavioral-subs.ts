import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function main() {
  console.log("\n=== Checking subscriptions with unused/to-cancel status ===\n");

  const { data: subs, error } = await supabase
    .from("subscriptions")
    .select("*");

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log(`Total subscriptions: ${subs?.length || 0}`);

  // Group by status
  const byStatus: Record<string, any[]> = {};
  subs?.forEach((sub) => {
    if (!byStatus[sub.status]) byStatus[sub.status] = [];
    byStatus[sub.status].push(sub);
  });

  console.log("\n=== By Status ===");
  Object.entries(byStatus).forEach(([status, items]) => {
    console.log(`\n${status}: ${items.length}`);
    items.forEach((sub) => {
      console.log(
        `  - ${sub.user_id.substring(0, 12)}: ${sub.name} ($${sub.amount} ${sub.frequency})`
      );
    });
  });

  // Check if there are unused/to-cancel subscriptions
  const actionable = subs?.filter(
    (s) =>
      s.status === "unused" ||
      s.status === "to-cancel" ||
      s.subStatus === "unused" ||
      s.subStatus === "to-cancel"
  ) || [];

  console.log(`\n=== Actionable (unused/to-cancel) subscriptions ===`);
  console.log(`Count: ${actionable.length}`);
  if (actionable.length > 0) {
    actionable.forEach((sub) => {
      const amount = sub.amount;
      const frequency = sub.frequency || "monthly";
      const monthly =
        frequency === "yearly"
          ? amount / 12
          : frequency === "quarterly"
            ? amount / 3
            : frequency === "weekly"
              ? amount * 4
              : amount;

      console.log(`  - ${sub.name}: $${monthly.toFixed(2)}/month`);
      console.log(`    Status: ${sub.status}, Has amount: ${!!amount}`);
    });
  }

  // Check what fields actually exist
  if (subs && subs.length > 0) {
    console.log("\n=== Sample subscription fields ===");
    console.log(JSON.stringify(subs[0], null, 2).split("\n").slice(0, 15));
  }
}

main().catch(console.error);
