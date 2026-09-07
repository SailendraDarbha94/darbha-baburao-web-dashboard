import { z } from "zod";

// Query strings arrive as strings; an unselected filter often serialises as "?status=" (empty), which should
// mean "no filter", not a validation error.
export const emptyToUndefined = (value: unknown): unknown =>
  value === "" ? undefined : value;

export const optionalQuery = <T extends z.ZodType>(schema: T) =>
  z.preprocess(emptyToUndefined, schema.optional());
