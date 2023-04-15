import cache from "memory-cache";
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { decodeCalldata } from "../../src/decode/decode";
import { requestSchema } from "../../src/decode/decode.schemas";
import { fetchRemoteCachedConfig } from "../../src/network/fetch-remote-cached-config";

const isDev = process.env.NODE_ENV !== "production";

const cacheableConfig = [
  {
    toAddress:
      "0x090D4613473dEE047c3f2706764f49E0821D256e" /* Uniswap airdrop merkle */,
    functionSignature: "isClaimed(uint256)",
    checkResultShouldBeCached: (res: unknown) =>
      res ===
      "0x0000000000000000000000000000000000000000000000000000000000000001",
  },
];

let remoteCachedConfig: Partial<{
  [chainId: string]: Array<{
    toAddress: string;
    functionSignature: string;
    checkResultShouldBeCached: (res: unknown) => boolean;
  }>;
}> = {
  "137": [],
  "167002": [] /* Taiko Hackathon L2 */,
  "44787": [] /* Celo Alfajores Testnet */,
  "534353": [] /* Scroll alpha Testnet */,
};

const selectCacheableConfigLeaf = (to: string, chainId?: string) => {
  const staticLeaf = cacheableConfig.find(
    (leaf) => leaf.toAddress.toLowerCase() === to.toLowerCase()
  );
  if (!chainId || staticLeaf) {
    return staticLeaf;
  }
  // @ts-ignore
  const remoteLeaf = remoteCachedConfig[chainId].find(
    // @ts-ignore
    (leaf) => leaf.toAddress.toLowerCase() === to.toLowerCase()
  );
  return remoteLeaf;
};

const ONE_MINUTE_IN_MS = 60_000;
function proxyFetchFromEthNode(rpc: string, body: any) {
  return axios.post(rpc, body).then((res) => res.data);
}
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ result: string } | { error: string }>
) {
  const query = requestSchema.parse(req).query;
  const rpc = decodeURIComponent(query.rpc);
  const chainId = query?.chainId;
  if (chainId) {
    // TODO: Debounce this to only happen every hour or so
    fetchRemoteCachedConfig(chainId).then(
      (res) => (remoteCachedConfig[chainId] = res)
    );
  }
  const body = requestSchema.parse(req).body;
  const txn = body.params?.[0];
  if (isDev) {
    console.dir({
      body,
      params1: txn,
      params2: body.params?.[1],
    });
  }
  if (!txn) {
    console.log("no txn, returning early");
    return res.send(await proxyFetchFromEthNode(rpc, req.body));
  }
  const { data, to } = txn;
  const cacheableConfigLeaf = selectCacheableConfigLeaf(to, chainId);
  let cacheKey =
    `${to}-${cacheableConfigLeaf?.functionSignature}-${rpc}`.toLowerCase();

  let decodedTxn;
  if (cacheableConfigLeaf) {
    try {
      const { functionSignature } = cacheableConfigLeaf;
      // try/catch is needed because ABI support is hardly existant
      decodedTxn = await decodeCalldata(txn, functionSignature);
      cacheKey =
        `${to}-${functionSignature}-${decodedTxn.args}-${rpc}`.toLowerCase();
    } catch {
      console.log("in decode catch, returning early");
      return res.send(await proxyFetchFromEthNode(rpc, req.body));
    }
    if (!decodedTxn) {
      throw new Error("missing decoded txn");
    }

    if (!data) {
      return res.send({ error: "cached result" });
    }
    if (decodedTxn.signature === cacheableConfigLeaf.functionSignature) {
      const cacheResult = cache.get(cacheKey);
      if (cacheResult !== null) {
        console.log("Has cached response, returning early!");
        return res.status(200).json({ ...cacheResult, id: body.id });
      } else {
        console.log("Cache miss");
      }
    }
  }

  if (!decodedTxn) {
    return res.send(await proxyFetchFromEthNode(rpc, req.body));
  }

  const ethNodeResponse = await proxyFetchFromEthNode(rpc, req.body);

  if (
    cacheableConfigLeaf &&
    decodedTxn.signature === cacheableConfigLeaf.functionSignature
  ) {
    const shouldResultBeCached = cacheableConfigLeaf.checkResultShouldBeCached(
      ethNodeResponse.result
    );
    if (shouldResultBeCached) {
      console.log("set value in cache");
      cache.put(cacheKey, ethNodeResponse, ONE_MINUTE_IN_MS);
    } else {
      console.log("value shoule NOT be cached");
    }
  } else {
    console.log("did NOT set value in cache");
  }

  return res.status(200).json(ethNodeResponse);
}
