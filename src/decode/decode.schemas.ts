import { z } from "zod";

export const transactionSchema = z.object({
  to: z.string().startsWith("0x"),
  from: z.string().optional(),
  gas: z.any().optional(),
  gasPrice: z.any().optional(),
  value: z.any().optional(),
  data: z.any().optional(),
});
export const requestSchema = z.object({
  query: z.object({
    rpc: z.string(),
    chainId: z.union([z.literal("137"), z.undefined()]),
  }),
  body: z.object({
    jsonrpc: z.literal("2.0"),
    id: z.number().int(),
    method: z.string() /* eth_call */,
    params: z.union([
      z.tuple([transactionSchema, z.any() /* latest */]),
      z.undefined(),
    ]),
  }),
});
