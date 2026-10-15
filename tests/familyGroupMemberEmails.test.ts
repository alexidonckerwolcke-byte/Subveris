import { describe, expect, it, vi } from "vitest";
import { loadFamilyGroupMembersWithEmails } from "../supabase/functions/api/index";

function makeUsersClient(userRows: Array<{ id: string; email: string | null }>) {
  const queries: Array<{ table: string; selected?: string; filters: Array<[string, string[]]> }> = [];

  const client = {
    from: vi.fn((table: string) => {
      const query = { table, filters: [] as Array<[string, string[]]>, selected: "" };
      queries.push(query);
      const chain = {
        select: (columns: string) => {
          query.selected = columns;
          return chain;
        },
        in: (column: string, values: string[]) => {
          query.filters.push([column, values]);
          return chain;
        },
        then: (resolve: (value: { data: typeof userRows; error: null }) => unknown) =>
          Promise.resolve({ data: userRows, error: null }).then(resolve),
      };
      return chain;
    }),
  };

  return { client, queries };
}

describe("loadFamilyGroupMembersWithEmails", () => {
  it("fetches all missing member emails in one users query", async () => {
    const { client, queries } = makeUsersClient([
      { id: "member-2", email: "two@example.com" },
      { id: "member-3", email: "three@example.com" },
    ]);
    const members = [
      { id: "row-1", family_group_id: "group-1", user_id: "member-1", role: "owner", joined_at: "date-1", email: "one@example.com" },
      { id: "row-2", family_group_id: "group-1", user_id: "member-2", role: "member", joined_at: "date-2", email: null },
      { id: "row-3", family_group_id: "group-1", user_id: "member-3", role: "member", joined_at: "date-3", email: null },
    ];

    const result = await loadFamilyGroupMembersWithEmails(members, client as any);

    expect(client.from).toHaveBeenCalledTimes(1);
    expect(queries).toEqual([
      {
        table: "users",
        selected: "id, email",
        filters: [["id", ["member-2", "member-3"]]],
      },
    ]);
    expect(result.map((member) => member.email)).toEqual([
      "one@example.com",
      "two@example.com",
      "three@example.com",
    ]);
  });

  it("skips the email lookup when every member already has an email", async () => {
    const { client, queries } = makeUsersClient([]);
    const members = [
      { id: "row-1", family_group_id: "group-1", user_id: "member-1", role: "owner", joined_at: "date-1", email: "one@example.com" },
    ];

    const result = await loadFamilyGroupMembersWithEmails(members, client as any);

    expect(client.from).not.toHaveBeenCalled();
    expect(queries).toHaveLength(0);
    expect(result[0].email).toBe("one@example.com");
  });
});
