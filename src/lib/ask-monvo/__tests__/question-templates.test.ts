import { describe, it, expect } from "vitest";
import { tryQuestionTemplate } from "../question-templates";

/**
 * Minimal mock of SupabaseClient for template matching tests.
 * The handlers call supabase methods, so we need to provide stubs
 * that return empty data. We only care about whether the pattern matches.
 */
function mockSupabase(): any {
  const chainable: any = {
    select: () => chainable,
    eq: () => chainable,
    ilike: () => chainable,
    lt: () => chainable,
    gte: () => chainable,
    then: (resolve: any) => resolve({ data: [] }),
  };

  // Make the chainable thenable so await works
  Object.defineProperty(chainable, "then", {
    value: (resolve: any) => Promise.resolve({ data: [] }).then(resolve),
    writable: true,
  });

  return {
    auth: {
      getUser: () =>
        Promise.resolve({
          data: { user: { id: "test-user-id" } },
        }),
    },
    from: () => chainable,
  };
}

describe("tryQuestionTemplate — pattern matching", () => {
  const supabase = mockSupabase();

  it('"What did I spend on food?" matches spend-on-category template', async () => {
    const result = await tryQuestionTemplate(supabase, "What did I spend on food?");
    expect(result.matched).toBe(true);
  });

  it('"What did I spend on groceries" matches (no question mark)', async () => {
    const result = await tryQuestionTemplate(
      supabase,
      "What did I spend on groceries"
    );
    expect(result.matched).toBe(true);
  });

  it('"How much at Walmart?" matches merchant template', async () => {
    const result = await tryQuestionTemplate(supabase, "How much at Walmart?");
    expect(result.matched).toBe(true);
  });

  it('"How much did I spend at Costco?" matches merchant template', async () => {
    const result = await tryQuestionTemplate(
      supabase,
      "How much did I spend at Costco?"
    );
    expect(result.matched).toBe(true);
  });

  it('"What are my subscriptions?" matches subscriptions template', async () => {
    const result = await tryQuestionTemplate(
      supabase,
      "What are my subscriptions?"
    );
    expect(result.matched).toBe(true);
  });

  it('"List my subscriptions" matches subscriptions template', async () => {
    const result = await tryQuestionTemplate(
      supabase,
      "List my subscriptions"
    );
    expect(result.matched).toBe(true);
  });

  it('"Show my subscriptions" matches subscriptions template', async () => {
    const result = await tryQuestionTemplate(
      supabase,
      "Show my subscriptions"
    );
    expect(result.matched).toBe(true);
  });

  it('"Random unrelated question" does not match', async () => {
    const result = await tryQuestionTemplate(
      supabase,
      "Random unrelated question"
    );
    expect(result.matched).toBe(false);
  });

  it('"Tell me about the weather" does not match', async () => {
    const result = await tryQuestionTemplate(
      supabase,
      "Tell me about the weather"
    );
    expect(result.matched).toBe(false);
  });

  it("empty string does not match", async () => {
    const result = await tryQuestionTemplate(supabase, "");
    expect(result.matched).toBe(false);
  });
});
