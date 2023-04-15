import { ethers } from "ethers";
import { transactionSchema } from "./decode.schemas";
import z from "zod";

export async function decodeCalldata(
  txn: z.infer<typeof transactionSchema>,
  functionSignature: string
) {
  const abi = [`function ${functionSignature}`];
  let iface = new ethers.utils.Interface(abi);
  let y = iface.parseTransaction({ data: txn.data });

  return Promise.resolve(y);
}
